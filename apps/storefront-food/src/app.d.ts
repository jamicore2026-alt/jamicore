declare global {
  namespace App {
    interface Locals {
      customerId?: string;
      storeId?: string;
      csrfToken?: string;
      lang?: string;
      dir?: 'ltr' | 'rtl';
    }
  }
}

export {};
