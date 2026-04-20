import { Outlet } from 'react-router-dom';
import FinanceSectionHeader from '@/components/public/finance/FinanceSectionHeader';

export default function FinanceLayout() {
  return (
    <>
      <FinanceSectionHeader />
      <Outlet />
    </>
  );
}
