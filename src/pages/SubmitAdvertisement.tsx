import SubmissionContactPanel from '../components/SubmissionContactPanel';
import ChatbotPanel from '../components/ChatbotPanel';

export default function SubmitAdvertisementPage() {
  return (
    <>
      <SubmissionContactPanel context="advertisement" />
      <ChatbotPanel context="advertisement" />
    </>
  );
}
