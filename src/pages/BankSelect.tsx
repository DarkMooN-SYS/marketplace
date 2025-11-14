import React, { useCallback } from 'react';
import BankSelect from '../components/BankSelect';

const BankSelectPage: React.FC = () => {
  const handleSelect = useCallback((bank: string) => {
    // TODO: handle payment redirect or confirmation
    alert(`Selected bank: ${bank}`);
    window.location.hash = 'wallet';
  }, []);

  return <BankSelect onSelect={handleSelect} />;
};

export default BankSelectPage;
