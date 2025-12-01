/**
 * Patch for Hugging Face Inference API endpoint
 * The old endpoint router.huggingface.co is deprecated
 * This patches fetch calls to use the new router.huggingface.co endpoint
 */

export function patchHfEndpoint() {
  // Store original fetch
  const originalFetch = global.fetch;

  // Override fetch to redirect old endpoint to new one
  global.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string;
    let newInput: RequestInfo | URL;
    
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = String(input);
    }

    // Replace old endpoint with new one
    if (url.includes('router.huggingface.co')) {
      // Try router.huggingface.co without /hf-inference path
      // The router might work differently - try just replacing the domain
      let newUrl = url.replace('router.huggingface.co', 'router.huggingface.co');
      
      console.log(`Redirecting Hugging Face API call: ${url} -> ${newUrl}`);
      
      // Log the full request details for debugging
      if (init && init.headers) {
        const headersObj: Record<string, string> = {};
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headersObj[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            headersObj[key] = value;
          });
        } else {
          Object.assign(headersObj, init.headers);
        }
        console.log('Request details:', {
          method: init.method || 'GET',
          headers: headersObj,
        });
      }
      
      // Create new input with updated URL
      if (typeof input === 'string') {
        newInput = newUrl;
      } else if (input instanceof URL) {
        newInput = new URL(newUrl);
      } else if (input instanceof Request) {
        // Preserve headers and method from original request
        newInput = new Request(newUrl, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          redirect: input.redirect,
        });
      } else {
        newInput = newUrl;
      }
    } else {
      newInput = input;
    }

    try {
      const response = await originalFetch(newInput, init);
      
      // Log response status for debugging
      if (newInput && typeof newInput === 'string' && newInput.includes('router.huggingface.co')) {
        console.log(`HF API Response status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          const responseText = await response.clone().text().catch(() => 'Could not read response');
          console.error(`HF API Error response: ${responseText.substring(0, 500)}`);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Fetch error in patch:', error);
      throw error;
    }
  };
}

