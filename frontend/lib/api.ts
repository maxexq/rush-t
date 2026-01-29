import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base URLs for services
const CORE_SERVICE_URL = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080/api/v1';
const FLASH_SALE_URL = process.env.NEXT_PUBLIC_FLASH_SALE_URL || 'http://localhost:3000/api/v1';

// Core Service API (Go) - Events, Users, Orders
export const coreApi = axios.create({
  baseURL: CORE_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flash Sale Service API (Rust) - High-speed seat locking
export const flashSaleApi = axios.create({
  baseURL: FLASH_SALE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Response interceptor - Handle errors
const errorInterceptor = (error: AxiosError) => {
  if (error.response) {
    const { status, data } = error.response;
    
    // Unauthorized - Clear token and redirect to login
    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Only redirect on client side
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle specific error messages
    const errorData = data as { error?: string; message?: string };
    const message = errorData?.error || errorData?.message || 'An error occurred';
    
    return Promise.reject({
      status,
      message,
      data,
    });
  }
  
  return Promise.reject({
    status: 0,
    message: 'Network error. Please check your connection.',
  });
};

// Apply interceptors
coreApi.interceptors.request.use(requestInterceptor);
coreApi.interceptors.response.use((response) => response, errorInterceptor);

flashSaleApi.interceptors.request.use(requestInterceptor);
flashSaleApi.interceptors.response.use((response) => response, errorInterceptor);

