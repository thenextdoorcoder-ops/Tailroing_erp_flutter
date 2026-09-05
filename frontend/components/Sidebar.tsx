'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `block px-4 py-2 rounded ${
      pathname === path
        ? 'bg-gray-800 text-white'
        : 'text-gray-300 hover:bg-gray-800'
    }`;

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h1 className="text-xl font-bold mb-6">TMS</h1>

      <nav className="space-y-2">
        <Link href="/dashboard" className={linkClass('/dashboard')}>
          Dashboard
        </Link>
        <Link href="/customers" className={linkClass('/customers')}>
          Customers
        </Link>
        <Link href="/orders" className={linkClass('/orders')}>
          Orders
        </Link>
        <Link href="/products" className={linkClass('/products')}>
          Products
        </Link>
      </nav>
    </div>
  );
}
