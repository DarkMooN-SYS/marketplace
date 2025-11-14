// Survey Responses Store - Backend API Based
// Uses backend API instead of localStorage for survey responses

import { api } from '../api/adminApi';

export interface SurveyAnswer {
  questionId: string;
  value: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  submittedAt: string;
  answers: SurveyAnswer[];
}

// Survey responses are now stored in backend
// This file provides compatibility layer for existing code

export const surveyResponseStore = {
  // Submit survey response to backend
  async submit(surveyId: string, answers: Record<string, string | number | string[]>): Promise<{ responseId: string; reward?: number; rewardType?: string }> {
    try {
      const result = await api.surveys.submitResponse(surveyId, answers);
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('survey:response-submitted', {
        detail: { surveyId, responseId: result.responseId, reward: result.reward }
      }));
      
      return result;
    } catch (error) {
      console.error('Failed to submit survey response:', error);
      throw error;
    }
  },

  // Check if user already responded (backend will handle this via userId)
  async hasResponded(surveyId: string): Promise<boolean> {
    // This would require a backend endpoint to check user's responses
    // For now, backend handles duplicate prevention
    console.warn('hasResponded() should be handled by backend');
    return false;
  },

  // Get user's responses (would need backend endpoint)
  async getUserResponses(): Promise<SurveyResponse[]> {
    console.warn('getUserResponses() not implemented - requires backend endpoint');
    return [];
  }
};
