'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Building,
  Building2,
  Receipt,
  ShoppingCart,
  FileText,
  Store,
  LandPlot,
  Truck,
  HandCoins,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useEnabledServices } from '@/hooks/use-enabled-services';
import { useRouteLoading } from '@/components/molecules/route-loading-context';
import { CitizenPageLayout } from '@/components/molecules/citizen-page-layout';

/**
 * Payments page (standalone). Lists available payment services; each links to /services/[serviceId].
 * Auth is enforced by private layout.
 */
export default function PaymentsPage(): React.JSX.Element {
  const router = useRouter();
  const { enabledPaymentServices, isLoading: servicesLoading } =
    useEnabledServices();
  const { startRouteTransition, stopRouteTransition } = useRouteLoading();

  const iconMap: Record<string, LucideIcon> = {
    Building,
    Building2,
    Receipt,
    ShoppingCart,
    FileText,
    Store,
    LandPlot,
    Truck,
    HandCoins,
  };

  const paymentServices = enabledPaymentServices.map((service) => {
    const IconComponent = iconMap[service.icon as string] || FileText;
    return {
      ...service,
      icon: IconComponent,
    };
  });

  const handlePaymentServiceClick = (serviceId: string): void => {
    startRouteTransition();
    router.push(`${ROUTES.SERVICES}/${serviceId}`);
  };

  useEffect(() => {
    if (servicesLoading) {
      startRouteTransition();
    } else {
      stopRouteTransition();
    }
  }, [servicesLoading, startRouteTransition, stopRouteTransition]);

  return (
    <CitizenPageLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Choose a payment service to continue.
          </p>
        </div>

        <section>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paymentServices.map((service) => {
              const IconComponent = service.icon;
              return (
                <Card
                  key={service.id}
                  className="cursor-pointer border border-gray-200 bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                  onClick={() => handlePaymentServiceClick(service.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`flex-shrink-0 rounded-lg p-2 text-white ${service.color}`}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg font-semibold text-gray-800">
                          {service.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm leading-relaxed text-gray-700">
                      {service.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </CitizenPageLayout>
  );
}
