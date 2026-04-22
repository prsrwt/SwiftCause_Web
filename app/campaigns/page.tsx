'use client';

import { useRouter } from 'next/navigation';
import { CampaignListContainer } from '@/features/kiosk-campaign-list';
import { useAuth } from '@/shared/lib/auth-provider';
import { Campaign } from '@/shared/types';

export default function CampaignsPage() {
  const router = useRouter();
  const { currentKioskSession, handleLogout, refreshCurrentKioskSession } = useAuth();

  // Predefined amount click - use new magic link flow for all campaigns
  const handleSelectCampaign = (campaign: Campaign, amount?: number) => {
    if (amount) {
      // For predefined amounts, go directly to payment with new magic link flow
      const amountPence = Math.round(amount * 100);
      const donation = {
        campaignId: campaign.id,
        amount: amountPence,
        isGiftAid: false, // Donor hasn't opted in yet
        giftAidAccepted: false,
        giftAidEnabled: campaign.configuration.giftAidEnabled, // Campaign supports Gift Aid
        isRecurring: false,
        kioskId: currentKioskSession?.kioskId,
        donorName: 'Anonymous',
      };
      sessionStorage.setItem('donation', JSON.stringify(donation));
      sessionStorage.setItem('paymentBackPath', '/campaigns');
      router.push(`/payment/${campaign.id}`);
    } else {
      // No amount (donate button) - go to details page
      router.push(`/campaign/${campaign.id}`);
    }
  };

  // View campaign details (card click or donate button)
  const handleViewDetails = (campaign: Campaign) => {
    router.push(`/campaign/${campaign.id}`);
  };

  return (
    <CampaignListContainer
      kioskSession={currentKioskSession}
      onSelectCampaign={handleSelectCampaign}
      onViewDetails={handleViewDetails}
      onLogout={handleLogout}
      refreshCurrentKioskSession={refreshCurrentKioskSession}
    />
  );
}
