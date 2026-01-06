import { DocumentSource, Customer as BaseCustomer } from './types';

export interface Customer extends BaseCustomer {
  driveFolderId?: string; // Optioneel veld voor Google Drive map ID
}

