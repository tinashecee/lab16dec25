// Update the base URL and endpoints configuration
const API_CONFIG = {
  BASE_URL: '/api', // This will be proxied by Vite
  ENDPOINTS: {
    TESTS: '/getAllTestsAndProfiles',
    CENTERS: '/androidReferralListForCC',
    ORGANIZATIONS: '/androidOrganizationListForCC',
    PATIENT: '/LHRegisterBillAPI'
  }
} as const;

// Update the getAllTestsAndProfiles function to use fetch
export async function getAllTestsAndProfiles(token: string): Promise<any> {
  try {
    const url = `${API_CONFIG.ENDPOINTS.TESTS}/?token=${token}`;
    console.log('Sending request to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    if (data.code === 200) {
      return [...data.testList, ...data.profileTestList];
    } else {
      throw new Error(data.message || `API Error: ${data.code}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Update fetchCrelioCenters to use fetch
export async function fetchCrelioCenters(): Promise<CrelioDoctor[]> {
  try {
    const token = await getApiToken();
    if (!token) {
      throw new Error('API token not configured');
    }

    const tokenObj = {
      token,
      lastUpdatedTime: "2020-02-12T12:00:00Z"
    };

    const formData = new FormData();
    formData.append('tokenObj', JSON.stringify(tokenObj));

    const response = await fetch(API_CONFIG.ENDPOINTS.CENTERS, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Centers API Response:', data);

    if (data.code === 200 || data.referralList) {
      return data.referralList;
    } else {
      throw new Error(data.message || `API Error: ${data.code}`);
    }
  } catch (error) {
    console.error('Error fetching centers:', error);
    throw error;
  }
}

// Update other API functions similarly... 