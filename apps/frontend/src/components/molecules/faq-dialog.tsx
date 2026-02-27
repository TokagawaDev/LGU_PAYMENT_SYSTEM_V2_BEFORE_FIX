'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchPublicSettings } from '@/lib/settings';
import { Search, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ContactSupportDialog } from './contact-support-dialog';

interface FAQDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * FAQ Dialog Component
 * Displays frequently asked questions with search and filtering capabilities
 */
export function FAQDialog({
  children,
  open,
  onOpenChange,
}: FAQDialogProps): React.JSX.Element {
  const isControlled = typeof open !== 'undefined';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? open : internalOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [faq, setFaq] = useState<
    {
      question: string;
      answer: string;
      category: 'general' | 'payment' | 'technical' | 'account';
    }[]
  >([]);

  // Load settings.faq on open
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (nextOpen && faq.length === 0) {
      fetchPublicSettings()
        .then((s) => setFaq(s.faq || []))
        .catch(() => setFaq([]));
    }
  };

  // Ensure data loads when parent controls open state
  useEffect(() => {
    if (isOpen && faq.length === 0) {
      fetchPublicSettings()
        .then((s) => setFaq(s.faq || []))
        .catch(() => setFaq([]));
    }
  }, [isOpen]);

  const categories = [
    { id: 'all', name: 'All Questions', count: faq.length },
    {
      id: 'general',
      name: 'General',
      count: faq.filter((item) => item.category === 'general').length,
    },
    {
      id: 'payment',
      name: 'Payment',
      count: faq.filter((item) => item.category === 'payment').length,
    },
    {
      id: 'technical',
      name: 'Technical',
      count: faq.filter((item) => item.category === 'technical').length,
    },
    {
      id: 'account',
      name: 'Account',
      count: faq.filter((item) => item.category === 'account').length,
    },
  ];

  const filteredFAQ = useMemo(() => {
    return faq.filter((item) => {
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [faq, searchQuery, selectedCategory]);

  const toggleExpanded = (index: number): void => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'general':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'technical':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'account':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            <span>Frequently Asked Questions</span>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Find answers to common questions about our payment system and
            services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="text-xs"
                >
                  {category.name}
                  <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                    {category.count}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="p-6 text-center">
                  <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No questions found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search terms or category filter.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredFAQ.map((item, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                              item.category
                            )}`}
                          >
                            {item.category.charAt(0).toUpperCase() +
                              item.category.slice(1)}
                          </span>
                        </div>
                        <CardTitle
                          className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => toggleExpanded(index)}
                        >
                          {item.question}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(index)}
                        className="ml-2 p-1 h-auto"
                      >
                        {expandedItems.has(index) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  {expandedItems.has(index) && (
                    <CardContent className="pt-0">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Contact Support Link */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Still need help?
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  Can&apos;t find the answer you&apos;re looking for? Our
                  support team is here to help.
                </p>
                <ContactSupportDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Contact Support
                  </Button>
                </ContactSupportDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
