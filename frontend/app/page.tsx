import HomeContent from '@/components/HomeContent';

async function fetchData(url: string, defaultValue: any = null) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const res = await fetch(fullUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return defaultValue;
    return await res.json();
  } catch {
    return defaultValue;
  }
}

export default async function Home() {
  const [branding, socialLinks, paymentConfig, categoryTree, announcementConfig] = await Promise.all([
    fetchData('/public/branding', { shopName: 'KTown Aari Works', logoUrl: '' }),
    fetchData('/public/social-links', {}),
    fetchData('/ecom-payment/config', {}),
    fetchData('/public/ecom/categories/tree', []),
    fetchData('/public/platform-config/ANNOUNCEMENT_BANNER', null),
  ]);

  let announcement = null;
  if (announcementConfig?.value) {
    try {
      announcement = JSON.parse(announcementConfig.value);
    } catch {
      announcement = { text: announcementConfig.value };
    }
  }

  return (
    <HomeContent 
      initialBranding={branding}
      initialAnnouncement={announcement}
      initialCategories={categoryTree.slice(0, 6)}
      initialSocialLinks={socialLinks}
      initialPaymentConfig={paymentConfig}
    />
  );
}
