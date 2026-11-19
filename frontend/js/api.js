/* Central API client.*/
const Api = {
  request(method, path, data, { isForm = false, onProgress } = {}) {
    const options = {
      url: CONFIG.API_BASE + path,
      method: method,
      headers: {},
    };

    // Add the login token if the user is logged in
    const token = window.Auth ? Auth.token() : null;
    if (token) {
      options.headers.Authorization = 'Bearer ' + token;
    }

    // Add the data to send
    if (isForm) {
      // File upload: let the browser set the content type itself
      options.data = data;
      options.processData = false;
      options.contentType = false;

      if (onProgress) {
        options.xhr = () => this.createUploadXhr(onProgress);
      }
    } else if (data !== undefined) {
      // Normal request: send the data as JSON
      options.data = JSON.stringify(data);
      options.contentType = 'application/json';
    }

    // Send it, and turn any failure into { status, message }
    return $.ajax(options).then(
      (response) => response,
      (xhr) => {
        const error = this.toError(xhr, path);
        return $.Deferred().reject(error);
      }
    );
  },

  // Reports upload progress as a percentage
  createUploadXhr(onProgress) {
    const xhr = $.ajaxSettings.xhr();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    return xhr;
  },

  // Turns a failed request into { status, message }
  toError(xhr, path) {
    const body = xhr.responseJSON || {};
    let message = body.errors?.[0]?.message || body.message;

    if (xhr.status === 0) {
      message = 'Could not reach the server. Check your connection and try again.';
    } else if (xhr.status === 401 && !path.startsWith('/auth/') && window.Auth) {
      Auth.expire(); // session expired: sign out and redirect to login
    } else if (xhr.status === 403) {
      message = message || 'You do not have permission to do this.';
    } else if (xhr.status >= 500) {
      message = message || 'The server had a problem. Please try again.';
    }

    return { status: xhr.status, message: message || 'Something went wrong.' };
  },

  // Shortcuts
  get(path)         { return this.request('GET', path); },
  post(path, data)  { return this.request('POST', path, data); },
  put(path, data)   { return this.request('PUT', path, data); },
  patch(path, data) { return this.request('PATCH', path, data); },
  del(path)         { return this.request('DELETE', path); },

  upload(path, formData, method = 'POST', onProgress) {
    return this.request(method, path, formData, { isForm: true, onProgress });
  },
};