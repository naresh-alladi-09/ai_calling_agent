import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import httpx

from app.core.config import settings
from app.models.lead import CollegeLead
from app.models.call import CallRecord
from app.models.demo import DemoBooking
from app.models.compliance import SuppressionRecord

logger = logging.getLogger("nani_conversation")

# Ground truth authentic SMS features (extracted from user's Student Management System)
SMS_KNOWLEDGE_BASE = """
AUTHENTIC STUDENT MANAGEMENT SYSTEM FEATURES:
1. 3-Tier Role-Based Access Control (RBAC):
   - Admin: User provisioning, department analytics, audit trails, system configuration.
   - Teacher: QR session broadcasting, live check-in monitoring, manual attendance register fallback, marks entry.
   - Student: Student data isolation (strictly prohibited from seeing other students' records), report cards, timetable, announcements.
2. Expiring QR Code Attendance Engine:
   - Faculty generates dynamic cryptographic 30-to-60 second time-based QR code on classroom projector or mobile.
   - Prevents proxy attendance completely (code expires before it can be shared via WhatsApp/photos).
   - Live attendee check-in polling every 3 seconds.
   - Database-enforced duplicate check-in prevention.
3. Mathematical Shortage Engine:
   - Computes attendance shortage percentages automatically based on UGC 75% threshold.
   - Alerts students and staff proactively before semester end exams.
4. Academic Performance & UGC SGPA/CGPA Tracking:
   - Direct marks entry, grade point conversion, dynamic SGPA/CGPA calculation.
   - No fake data: all metrics calculated dynamically from relational database.
5. Soft Deletion & Audit Trail Observability:
   - Complete logging for institutional accreditation and audits.
"""

TELUGU_OPENING = (
    "నమస్కారం అండి! మీ కాలేజీలో స్టూడెంట్ అటెండెన్స్ మరియు అడ్మినిస్ట్రేషన్ బాధ్యతలు చూస్తున్న వారితో మాట్లాడుతున్నానా అండి? "
    "నేను స్టూడెంట్ మేనేజ్‌మెంట్ సాఫ్ట్‌వేర్ ప్రాజెక్ట్ తరఫున మాట్లాడుతున్న ఏఐ కాలింగ్ అసిస్టెంట్‌ని. "
    "మా సిస్టమ్ గురించి ఒక రెండు నిమిషాలు మాట్లాడవచ్చా అండి?"
)

ENGLISH_OPENING = (
    "Hello! Am I speaking with the person responsible for student attendance or administration at your college? "
    "I am an AI calling assistant representing an enterprise Student Management Software project. "
    "Would you have a moment for a quick introduction?"
)


class ConversationEngine:
    def __init__(self):
        self.openai_api_key = settings.LLM_API_KEY

    def detect_language(self, text: str, current_lang: str = "te") -> str:
        """
        Detect whether user input is primarily Telugu or English.
        """
        # Telugu Unicode range: \u0c00-\u0c7f
        telugu_chars = re.findall(r'[\u0C00-\u0C7F]', text)
        if len(telugu_chars) >= 2:
            return "te"

        # Common romanized Telugu words
        telugu_romanized = [
            "namaskaram", "cheppandi", "cheppandi", "ledu", "avunu", "kavali", "vaddu", 
            "matladandi", "evaru", "repu", "tarvata", "principal", "vundi", "unnadi",
            "pampandi", "enti", "ela", "babu", "andi"
        ]
        words = text.lower().split()
        for w in words:
            if w in telugu_romanized:
                return "te"

        # Check for English indicators
        english_words = ["yes", "no", "hello", "hi", "busy", "send", "email", "price", "demo", "software", "call"]
        english_matches = sum(1 for w in words if w in english_words)
        if english_matches >= 1 and len(telugu_chars) == 0:
            return "en"

        return current_lang

    def get_opening_turn(self, lead: CollegeLead, lang: Optional[str] = None) -> Tuple[str, str]:
        """
        Return initial transparent opening message in preferred language.
        """
        selected_lang = lang or lead.preferred_language or "te"
        if selected_lang == "te":
            msg = f"నమస్కారం {lead.contact_name} గారు! {lead.college_name} కాలేజీలో స్టూడెంట్ అటెండెన్స్ మరియు అడ్మినిస్ట్రేషన్ బాధ్యతలు చూస్తున్న వారితో మాట్లాడుతున్నానా అండి? నేను స్టూడెంట్ మేనేజ్‌మెంట్ సాఫ్ట్‌వేర్ తరఫున మాట్లాడుతున్న ఏఐ కాలింగ్ అసిస్టెంట్‌ని. ఒక రెండు నిమిషాలు మాట్లాడవచ్చా అండి?"
            return msg, "te"
        else:
            msg = f"Hello {lead.contact_name}! Am I speaking with the person responsible for student attendance or administration at {lead.college_name}? I am an AI calling assistant representing our Student Management Software project. Would you have a moment for a quick introduction?"
            return msg, "en"

    async def process_turn(
        self,
        user_input: str,
        dialog_history: List[Dict[str, str]],
        lead: CollegeLead,
        current_lang: str = "te"
    ) -> Dict[str, Any]:
        """
        Process user speech utterance and return conversational response, detected objections,
        outcome classification, and scheduling info.
        """
        lang = self.detect_language(user_input, current_lang)
        lower_input = user_input.lower().strip()

        # 1. OPT-OUT / DND CHECK (Highest Priority Rule)
        opt_out_phrases = [
            "don't call", "do not call", "stop calling", "remove my number", "block me", 
            "dnd", "malli call cheyoddu", "call cheyoddu", "ivvi vaddu", "number theeyandi", "opt out"
        ]
        if any(p in lower_input for p in opt_out_phrases):
            if lang == "te":
                reply = "ఖచ్చితంగా అండి, మీకు కలిగిన అసౌకర్యానికి క్షమించండి. మీ నంబర్‌ను మా కాంటాక్ట్ లిస్ట్ నుండి వెంటనే తొలగిస్తున్నాము. ఇకపై మీకు ఎలాంటి కాల్స్ రావు. ధన్యవాదాలు, హావ్ ఎ గుడ్ డే!"
            else:
                reply = "I completely understand and apologize for the interruption. I am immediately adding your number to our Do-Not-Call suppression list. You will not receive any further promotional calls. Thank you and have a good day."
            
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "completed",
                "outcome": "opted_out",
                "detected_objections": ["Requested Do-Not-Call Suppression"],
                "opt_out_detected": True,
                "demo_booking": None,
                "ai_summary": "Lead requested immediate opt-out and DND suppression. Permanently suppressed.",
            }

        # 2. IMMEDIATE REFUSAL / NOT INTERESTED CHECK
        not_interested_phrases = [
            "not interested", "no interest", "don't want", "dont want", "interest ledu", 
            "vaddu", "avsaram ledu", "avasaram ledu", "no thanks"
        ]
        if any(p in lower_input for p in not_interested_phrases):
            if lang == "te":
                reply = "సరేనండి, మీ సమయాన్ని కేటాయించినందుకు చాలా ధన్యవాదాలు. మీకు మంచి రోజు కలగాలని కోరుకుంటున్నాను!"
            else:
                reply = "Understood! Thank you very much for your time, and have a wonderful day."

            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "completed",
                "outcome": "not_interested",
                "detected_objections": ["Not Interested in Student Management System"],
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "Prospect declined the pitch. Agent politely ended call without being aggressive.",
            }

        # 3. BUSY / CALL LATER CHECK
        busy_phrases = ["busy", "call later", "call tomorrow", "meeting", "class", "tarvata call cheyandi", "repu call cheyandi", "class lo unnanu", "meeting lo unnanu"]
        if any(p in lower_input for p in busy_phrases):
            if lang == "te":
                reply = "సరేనండి, మీరు బిజీగా ఉన్నారని అర్థమైంది. నేను మీకు వీలైనప్పుడు లేదా రేపు మళ్ళీ కాల్ చేస్తాను. ధన్యవాదాలు!"
            else:
                reply = "Understood, I realize you are busy right now. I will schedule a follow-up call tomorrow or at a more convenient time. Thank you!"

            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "completed",
                "outcome": "callback_requested",
                "detected_objections": ["Prospect currently busy / in class"],
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "Recipient was busy/in lecture. Requested callback.",
            }

        # 4. If LLM API Key is configured, use OpenAI GPT with structured prompt
        if self.openai_api_key:
            try:
                return await self._call_llm_conversation(user_input, dialog_history, lead, lang)
            except Exception as e:
                logger.warning(f"LLM call failed, falling back to rule-based dialog engine: {e}")

        # 5. HIGH-ACCURACY RULE-BASED DIALOG ENGINE (Deterministic & Zero-Hallucination)
        return self._rule_based_response(user_input, dialog_history, lead, lang)

    def _rule_based_response(
        self,
        user_input: str,
        dialog_history: List[Dict[str, str]],
        lead: CollegeLead,
        lang: str
    ) -> Dict[str, Any]:
        lower = user_input.lower()
        objections = []

        # Objection: Already have software / ERP
        if any(k in lower for k in ["already have", "already using", "erp undi", "software undi", "we use software", "we have software"]):
            objections.append("Already using existing software/ERP")
            if lang == "te":
                reply = (
                    "చాలా మంచిదండి! చాలా కాలేజీలు ఇప్పటికే ERP వాడుతున్నాయి, కానీ చాలా చోట్ల స్టూడెంట్స్ ప్రాక్సీ అటెండెన్స్ వేయడం పెద్ద సమస్యగా మారింది. "
                    "మా సాఫ్ట్‌వేర్‌లో 30 సెకండ్ల dynamic expiring QR కోడ్ ఉంటుంది, దీనివల్ల ప్రాక్సీలు పూర్తిగా ఆగిపోతాయి. అంతేకాక 75% అటెండెన్స్ షార్టేజ్ ఆటోమేటిక్‌గా లెక్కిస్తుంది. "
                    "ఒక 10 నిమిషాల ఆన్‌లైన్ డెమోలో ఇది మీ కాలేజీకి ఎలా సరిపోతుందో చూపించవచ్చా అండి?"
                )
            else:
                reply = (
                    "That is great! Many colleges already have an ERP, but faculty frequently face proxy attendance issues. "
                    "Our system features a 30-second expiring dynamic QR code that prevents proxy check-ins completely, along with automated 75% shortage calculation. "
                    "Would you be open to a quick 10-minute online walkthrough this week?"
                )
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "in_progress",
                "outcome": "interested",
                "detected_objections": objections,
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "Prospect has existing software. Agent highlighted proxy-proof expiring QR attendance.",
            }

        # Objection: Manual attendance
        if any(k in lower for k in ["manual", "paper", "register", "pusthakam", "manual attendance"]):
            objections.append("Using manual paper registers")
            if lang == "te":
                reply = (
                    "అవునండి, మాన్యువల్ రిజిస్టర్లలో సంతకాలు తీసుకోవడం వల్ల ప్రతి నెలా 75% అటెండెన్స్ షార్టేజ్ మరియు UGC పర్సంటేజీలు లెక్కించడానికి అధ్యాపకులకు గంటల సమయం పడుతుంది. "
                    "మా సిస్టమ్ కేవలం ఒక్క క్లిక్‌తో అటెండెన్స్ షార్టేజ్ నోటీసులను ఆటోమేటిక్‌గా తయారుచేస్తుంది. "
                    "దీనిపై ఒక చిన్న 10 నిమిషాల డెమో చూడడానికి మీకు ఆసక్తి ఉందా అండి?"
                )
            else:
                reply = (
                    "Indeed, paper registers require faculty to spend hours manually tallying shortage percentages and UGC reports every month. "
                    "Our mathematical shortage engine automates 75% eligibility reports and alerts students instantly. "
                    "May we show your department a quick 10-minute demo?"
                )
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "in_progress",
                "outcome": "interested",
                "detected_objections": objections,
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "College currently uses manual registers. Agent explained automated shortage engine.",
            }

        # Objection: Price / Cost
        if any(k in lower for k in ["price", "cost", "entha", "fees", "pricing", "budget"]):
            objections.append("Pricing inquiry")
            if lang == "te":
                reply = (
                    "ధర మీ కాలేజీలోని మొత్తం విద్యార్థుల సంఖ్యను బట్టి చాలా సరసమైన వార్షిక రుసుముగా ఉంటుంది అండి. "
                    "ఒక 10 నిమిషాల డెమోలో మీ కాలేజీ అవసరాలను బట్టి ఖచ్చితమైన కొటేషన్ ఇస్తాము. ఈ గురువారం లేదా శుక్రవారం డెమో షెడ్యూల్ చేయవచ్చా అండి?"
                )
            else:
                reply = (
                    "Our pricing is structured transparently and affordably based on your institution's total student enrollment. "
                    "Our technical team provides an exact quotation during a 10-minute demo. Could we schedule a session for this Thursday or Friday?"
                )
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "in_progress",
                "outcome": "interested",
                "detected_objections": objections,
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "Inquired about pricing. Agent offered demo for exact quotation.",
            }

        # Objection: Send email / details
        if any(k in lower for k in ["send details", "send email", "mail cheyandi", "whatsapp", "details pampandi", "send brochure"]):
            objections.append("Requested information via email")
            if lang == "te":
                reply = (
                    "ఖచ్చితంగా అండి! మీకు పూర్తి వివరాలు ఈమెయిల్ ద్వారా పంపిస్తాను. అలాగే లైవ్ QR అటెండెన్స్ మరియు SGPA క్యాలిక్యులేషన్ ఎలా పనిచేస్తుందో చూడడానికి రేపు ఒక 10 నిమిషాల డెమో షెడ్యూల్ చేయవచ్చా అండి?"
                )
            else:
                reply = (
                    "Certainly! I will gladly send our product brochure to your email. Would you also be open to a 10-minute online demonstration tomorrow to see the live QR check-in firsthand?"
                )
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "in_progress",
                "outcome": "info_requested",
                "detected_objections": objections,
                "opt_out_detected": False,
                "demo_booking": None,
                "ai_summary": "Prospect requested details via email; invited for live demonstration.",
            }

        # Demo agreement / Positive confirmation
        if any(k in lower for k in ["yes", "ok", "okay", "sure", "sare", "avunu", "demo", "schedule", "repu", "thursday", "friday", "tomorrow"]):
            date_str = (datetime.now(timezone.utc)).strftime("%Y-%m-%d")
            time_str = "11:30 AM IST"
            
            if lang == "te":
                reply = (
                    f"చాలా సంతోషం అండి! మీ డెమోని రేపు ఉదయం 11:30 గంటలకు షెడ్యూల్ చేస్తున్నాను. "
                    f"మా టెక్నికల్ టీమ్ మీతో కనెక్ట్ అయ్యి QR అటెండెన్స్ మరియు స్టూడెంట్ మేనేజ్‌మెంట్ సిస్టమ్ పూర్తి ఫీచర్లను వివరిస్తుంది. "
                    f"మీ విలువైన సమయానికి ధన్యవాదాలు {lead.contact_name} గారు!"
                )
            else:
                reply = (
                    f"Wonderful! I have scheduled your online product demonstration for tomorrow at 11:30 AM IST. "
                    f"Our technical specialist will demonstrate the expiring QR attendance and grading system. "
                    f"Thank you very much for your time, {lead.contact_name}!"
                )
            
            return {
                "agent_response": reply,
                "detected_language": lang,
                "call_status": "completed",
                "outcome": "demo_requested",
                "detected_objections": objections,
                "opt_out_detected": False,
                "demo_booking": {
                    "scheduled_date": date_str,
                    "scheduled_time": time_str,
                    "contact_name": lead.contact_name,
                    "contact_phone": lead.phone_number,
                    "contact_email": lead.email,
                    "requirements_notes": "Expiring QR attendance & shortage calculation demo requested."
                },
                "ai_summary": "Demo successfully confirmed with college administration.",
            }

        # Default discovery fallback
        if lang == "te":
            reply = (
                "మా స్టూడెంట్ మేనేజ్‌మెంట్ సిస్టమ్‌లో 3-టయర్ RBAC (అడ్మిన్, టీచర్, స్టూడెంట్), 30 సెకన్ల dynamic QR అటెండెన్స్ మరియు UGC SGPA/CGPA ట్రాకింగ్ ఉన్నాయి అండి. "
                "మీ కాలేజీకి ఇది చాలా సమయాన్ని ఆదా చేస్తుంది. ఒక 10 నిమిషాల డెమో చూడడానికి మీకు వీలవుతుందా అండి?"
            )
        else:
            reply = (
                "Our Student Management System provides 3-tier Role-Based Access Control, 30-second expiring QR attendance, and automated UGC SGPA/CGPA calculation. "
                "It eliminates proxy attendance and saves hours of administrative effort. Would you like a brief 10-minute online demonstration?"
            )

        return {
            "agent_response": reply,
            "detected_language": lang,
            "call_status": "in_progress",
            "outcome": "interested",
            "detected_objections": objections,
            "opt_out_detected": False,
            "demo_booking": None,
            "ai_summary": "Engaged in discovery questions regarding student management capabilities.",
        }

    async def _call_llm_conversation(
        self,
        user_input: str,
        dialog_history: List[Dict[str, str]],
        lead: CollegeLead,
        lang: str
    ) -> Dict[str, Any]:
        """
        Call OpenAI API with strict guidelines to prevent hallucinations.
        """
        system_instruction = f"""
You are Nani, a friendly, professional, respectful, concise Indian male AI sales caller representing a full-stack Student Management System.
You speak fluent Telugu and Indian English, adapting naturally to the recipient.

STRICT CONSTRAINTS:
1. Explain ONLY features that actually exist in the Student Management System:
{SMS_KNOWLEDGE_BASE}
2. DO NOT invent customer testimonials, college partnerships, certifications, revenue claims, security guarantees, or unlisted capabilities.
3. If asked about pricing: state that pricing is tailored affordably based on student enrollment, and offer a 10-minute demo for an exact quotation.
4. If recipient declines or says not interested: stop the pitch immediately, thank them, and politely close.
5. If recipient requests Do-Not-Call or opt-out: immediately apologize, confirm removal from the calling list, and close.
6. Keep responses under 2-3 sentences. Short, natural, conversational spoken flow.

Return a valid JSON object matching this schema:
{{
  "agent_response": "spoken response text in requested language",
  "detected_language": "te" or "en",
  "call_status": "in_progress" or "completed",
  "outcome": "interested" | "demo_requested" | "callback_requested" | "info_requested" | "not_interested" | "opted_out",
  "detected_objections": ["list of objections"],
  "opt_out_detected": false,
  "demo_booking": null or {{"scheduled_date": "YYYY-MM-DD", "scheduled_time": "HH:MM AM/PM", "requirements_notes": "..."}},
  "ai_summary": "1 sentence summary"
}}
"""
        messages = [{"role": "system", "content": system_instruction}]
        for turn in dialog_history[-6:]:
            role = "assistant" if turn.get("role") in ["agent", "assistant"] else "user"
            messages.append({"role": role, "content": turn.get("text", "")})
        messages.append({"role": "user", "content": user_input})

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": messages,
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"}
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                raise Exception(f"OpenAI error {resp.status_code}: {resp.text}")


conversation_engine = ConversationEngine()
