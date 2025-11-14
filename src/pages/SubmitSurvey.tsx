import SubmissionContactPanel from '../components/SubmissionContactPanel';
import ChatbotPanel from '../components/ChatbotPanel';

export default function SubmitSurveyPage() {
  return (
    <>
      <SubmissionContactPanel context="survey" />
      <ChatbotPanel context="survey" />
    </>
  );
}
