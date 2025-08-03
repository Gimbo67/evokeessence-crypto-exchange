import crypto from 'crypto';
import axios from 'axios';

export interface SumSubAccessToken {
  token: string;
  userId: string;
  ttl: number;
}

export interface SumSubApplicant {
  id: string;
  createdAt: string;
  clientId: string;
  inspectionId: string;
  externalUserId: string;
  info: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
  };
  email: string;
  phone: string;
  review: {
    reviewId: string;
    attemptId: string;
    attemptCnt: number;
    elapsedSincePendingMs: number;
    elapsedSinceQueuedMs: number;
    reprocessing: boolean;
    levelName: string;
    createDate: string;
    reviewDate: string;
    reviewResult: {
      reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
      label: string;
      rejectLabels: string[];
      reviewRejectType: string;
    };
    reviewStatus: 'init' | 'pending' | 'prechecked' | 'queued' | 'completed' | 'onHold';
  };
}

export interface SumSubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  levelName: string;
  externalUserId: string;
  type: 'applicantReviewed' | 'applicantPending' | 'applicantCreated' | 'applicantOnHold' | 'applicantActionPending' | 'applicantActionReviewed' | 'applicantActionOnHold' | 'applicantPersonalInfoChanged' | 'applicantTagsChanged' | 'applicantActivated' | 'applicantDeactivated' | 'applicantDeleted' | 'applicantReset' | 'applicantLevelChanged' | 'applicantWorkflowCompleted' | 'applicantWorkflowFailed';
  reviewResult?: {
    reviewAnswer: 'GREEN' | 'RED' | 'YELLOW';
    label?: string;
    rejectLabels?: string[];
    reviewRejectType?: string;
    buttonIds?: string[];
  };
  reviewStatus: 'init' | 'pending' | 'prechecked' | 'queued' | 'completed' | 'onHold';
  createdAt?: string;
  createdAtMs?: string;
  clientId?: string;
  sandboxMode?: boolean;
  applicantType?: string;
  applicantActionId?: string;
  externalApplicantActionId?: string;
}

class SumSubService {
  private readonly baseUrl = 'https://api.sumsub.com';
  private readonly appToken: string;
  private readonly secretKey: string;
  private readonly levelName: string;

  constructor() {
    this.appToken = process.env.SUMSUB_APP_TOKEN || '';
    this.secretKey = process.env.SUMSUB_SECRET_KEY || '';
    this.levelName = process.env.SUMSUB_LEVEL_NAME || 'basic-kyc-level';
    
    if (!this.appToken || !this.secretKey) {
      console.warn('[SumSub] Missing required environment variables: SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY');
    }
  }

  /**
   * Generate access token for WebSDK
   */
  async generateAccessToken(userId: string, userEmail?: string): Promise<SumSubAccessToken> {
    if (!this.appToken || !this.secretKey) {
      throw new Error('SumSub credentials not configured');
    }

    const method = 'POST';
    const url = `/resources/accessTokens?userId=${userId}&ttlInSecs=3600&levelName=${this.levelName}`;
    
    const headers = this.createHeaders(method, url);
    
    const requestData = {
      userId,
      ttlInSecs: 3600,
      levelName: this.levelName
    };

    if (userEmail) {
      // @ts-ignore
      requestData.email = userEmail;
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        headers,
        data: requestData
      });

      console.log('[SumSub] Access token generated successfully for user:', userId);
      
      return {
        token: response.data.token,
        userId: response.data.userId,
        ttl: response.data.ttl
      };
    } catch (error) {
      console.error('[SumSub] Failed to generate access token:', error.response?.data || error.message);
      throw new Error('Failed to generate SumSub access token');
    }
  }

  /**
   * Get applicant info by ID
   */
  async getApplicantInfo(applicantId: string): Promise<SumSubApplicant> {
    if (!this.appToken || !this.secretKey) {
      throw new Error('SumSub credentials not configured');
    }

    const method = 'GET';
    const url = `/resources/applicants/${applicantId}/one`;
    
    const headers = this.createHeaders(method, url);

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${url}`,
        headers
      });

      console.log('[SumSub] Applicant info retrieved successfully:', applicantId);
      return response.data;
    } catch (error) {
      console.error('[SumSub] Failed to get applicant info:', error.response?.data || error.message);
      throw new Error('Failed to retrieve applicant information');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.secretKey) {
      console.warn('[SumSub] Cannot verify webhook signature - secret key not configured');
      return false;
    }

    // SumSub uses a specific webhook secret key format
    const webhookSecret = 'ObDcQF3jBNaGcBmWFmAmgQp-Cc0'; // Your provided webhook secret
    
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace('sha256=', '');
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    console.log('[SumSub Webhook] Signature verification:', {
      received: cleanSignature,
      expected: expectedSignature,
      match: cleanSignature === expectedSignature
    });

    return cleanSignature === expectedSignature;
  }

  /**
   * Create headers for API requests
   */
  private createHeaders(method: string, url: string, body?: any): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    let bodyString = '';
    if (body && typeof body === 'object') {
      bodyString = JSON.stringify(body);
    }

    const stringToSign = `${timestamp}${method.toUpperCase()}${url}${bodyString}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');

    return {
      'X-App-Token': this.appToken,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': timestamp,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Map SumSub review result to internal KYC status
   */
  mapSumSubStatusToKycStatus(reviewResult: string, reviewStatus: string): string {
    // If review is not completed, return pending
    if (reviewStatus !== 'completed') {
      return 'pending';
    }

    // Map completed review results
    switch (reviewResult) {
      case 'GREEN':
        return 'approved';
      case 'RED':
        return 'rejected';
      case 'YELLOW':
        return 'pending'; // Yellow requires manual review
      default:
        return 'pending';
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.appToken && this.secretKey);
  }
}

export const sumSubService = new SumSubService();