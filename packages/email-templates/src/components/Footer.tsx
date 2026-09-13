import { Text, Hr } from '@react-email/components';

export const Footer = () => {
  return (
    <div className="mt-8">
      <Hr className="border-surface my-6" />
      <Text className="text-zinc-300 text-xs leading-5" style={{ color: '#d4d4d8' }}>
        This is an automated security notification from Aegis. Do not reply to this email.
        <br />
        Secure systems are built on zero trust. Always verify the source of unexpected requests.
      </Text>
      <Text className="text-zinc-400 text-xs leading-5 mt-2" style={{ color: '#a1a1aa' }}>
        © {new Date().getFullYear()} Aegis Security. All rights reserved.
      </Text>
    </div>
  );
};
