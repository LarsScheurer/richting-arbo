import React from 'react';
import { DocType } from '../types';
import { EmailIcon, GoogleDocIcon, PdfIcon } from '../components/icons';

export const getDocIcon = (type: DocType) => {
    switch(type) {
        case DocType.EMAIL: return <EmailIcon />;
        case DocType.GOOGLE_DOC: return <GoogleDocIcon />;
        case DocType.PDF: return <PdfIcon />;
        case DocType.URL: return <span className="text-xl">🔗</span>;
        default: return <span className="text-xl">📝</span>;
    }
};

