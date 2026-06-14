import * as React from 'react';
import { Text, Hr } from '@react-email/components';

export const Footer = () => {
  return (
    <div className="mt-8">
      <Hr className="border-surface my-6" />
      <Text className="text-textMuted text-xs leading-5">
        This is an automated security notification from Aegis. Do not reply to this email.
        <br />
        Secure systems are built on zero trust. Always verify the source of unexpected requests.
      </Text>
      <Text className="text-textMuted text-xs leading-5 mt-2">
        © {new Date().getFullYear()} Aegis Security. All rights reserved.
      </Text>
    </div>
  );
};
