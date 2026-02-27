'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { fetchPublicSettings } from '@/lib/settings';
import { Mail, Phone, MapPin, Globe, Clock, MessageCircle } from 'lucide-react';

interface ContactSupportDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Contact Support Dialog Component
 * Displays contact information and support details in a popup dialog
 */
export function ContactSupportDialog({
  children,
  open,
  onOpenChange,
}: ContactSupportDialogProps): React.JSX.Element {
  const isControlled = typeof open !== 'undefined';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;
  const [contact, setContact] = useState<{
    address: string;
    phone: string;
    email: string;
    website: string;
  } | null>(null);

  // load on open - always fetch fresh data when dialog opens
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (nextOpen) {
      // Always fetch fresh data when dialog opens to ensure latest contact info from admin settings
      fetchPublicSettings({ forceRefresh: true })
        .then((s) => setContact(s.contact))
        .catch(() => setContact(null));
    }
  };

  // Ensure data loads when parent controls open state - always fetch fresh
  useEffect(() => {
    if (isOpen) {
      // Always fetch fresh data to ensure latest contact info from admin settings
      fetchPublicSettings({ forceRefresh: true })
        .then((s) => setContact(s.contact))
        .catch(() => setContact(null));
    }
  }, [isOpen]);

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      value: contact?.phone || '',
      description: 'Call us during business hours',
      action: 'Call Now',
      href: contact?.phone ? `tel:${contact.phone}` : '#',
    },
    {
      icon: Mail,
      title: 'Email Support',
      value: contact?.email || '',
      description: 'Send us an email anytime',
      action: 'Send Email',
      href: contact?.email ? `mailto:${contact.email}` : '#',
    },
    {
      icon: MapPin,
      title: 'Office Address',
      value: contact?.address || '',
      description: 'Visit our office',
      action: 'Get Directions',
      href: contact?.address
        ? `https://maps.google.com/?q=${encodeURIComponent(contact.address)}`
        : '#',
    },
    {
      icon: Globe,
      title: 'Website',
      value: contact?.website || '',
      description: 'Visit our official website',
      action: 'Visit Website',
      href: contact?.website || '#',
    },
  ];

  const handleContactAction = (href: string): void => {
    window.open(href, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Contact Support
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Get in touch with our customer service team for assistance with
            payments, technical issues, or general inquiries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Hours */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-800">
                    Business Hours
                  </h4>
                  <p className="text-sm text-blue-700">
                    Monday - Friday: 8:00 AM - 5:00 PM (Philippine Time)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    For urgent matters, leave a message and we&apos;ll respond
                    within 24 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <Card
                  key={method.title}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm">
                          {method.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 break-words">
                          {method.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {method.description}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => handleContactAction(method.href)}
                        >
                          {method.action}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Support Info */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <MessageCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Need Immediate Help?
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    For technical issues or payment problems, please include
                    your transaction reference number when contacting support.
                    This helps us assist you faster.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
