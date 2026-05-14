declare global {
  namespace App {
    interface Locals {
      customerId?: string;
      storeId?: string;
      csrfToken?: string;
    }
  }
}

export {};
