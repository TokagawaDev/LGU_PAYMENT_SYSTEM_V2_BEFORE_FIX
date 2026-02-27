'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, Textarea } from '@/components/ui/select';
import { Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  { id: 0, letter: 'A', label: 'Business Information' },
  { id: 1, letter: 'B', label: 'Business Operations' },
  { id: 2, letter: 'C', label: 'Business Activity' },
  { id: 3, letter: 'D', label: 'Applicant Information' },
  { id: 4, letter: 'E', label: 'Attachments' },
  { id: 5, letter: 'F', label: 'Submit' },
] as const;

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps): React.JSX.Element {
  return (
    <nav
      className="mb-6 sm:mb-8 rounded-xl bg-gray-50/80 border border-gray-100 px-3 py-4 sm:px-5 sm:py-5"
      aria-label="Application progress"
    >
      <div className="flex flex-wrap items-end justify-center gap-1 sm:gap-3">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300 shrink-0 self-center mb-5 sm:mb-6 flex-shrink-0"
                aria-hidden
              />
            )}
            <div className="flex flex-col items-center min-w-0 flex-shrink-0">
              <div
                className={`
                  flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold
                  transition-all duration-200 ease-out
                  ${
                    step.id === currentStep
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-400/40'
                      : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
                  }
                `}
                aria-current={step.id === currentStep ? 'step' : undefined}
              >
                {step.letter}
              </div>
              <span
                className={`
                  mt-2 sm:mt-2.5 text-center text-[11px] leading-tight font-medium sm:text-sm max-w-[68px] sm:max-w-[100px] md:max-w-none truncate sm:whitespace-normal sm:overflow-visible
                  ${step.id === currentStep ? 'text-gray-900' : 'text-gray-500'}
                `}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

function Label({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 mb-1.5 tracking-tight ${className}`}
    >
      {children}
    </label>
  );
}

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-4">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2.5 cursor-pointer py-1 min-h-[2.25rem] sm:min-h-0"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 rounded-full border-gray-300 text-rose-600 focus:ring-2 focus:ring-rose-500/30 focus:ring-offset-1"
          />
          <span className="text-sm text-gray-700 select-none">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Application form (UI from reference).
 * Step-by-step flow: Business Information → Business Operations → Business Activity
 * → Applicant Information → Attachments → Submit. Declaration and action buttons on final step.
 */
export function BusinessPermitApplicationForm(): React.JSX.Element {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [typeOfBusiness, setTypeOfBusiness] = React.useState('sole');
  const [registeredOwner, setRegisteredOwner] = React.useState('yes');
  const [sex, setSex] = React.useState('male');
  const [businessActivity, setBusinessActivity] = React.useState('main');
  const [agreeDeclaration, setAgreeDeclaration] = React.useState(false);

  const goNext = (): void => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = (): void => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="bg-white w-full min-w-0 overflow-hidden rounded-2xl border border-gray-100 shadow-sm sm:shadow-md sm:border-gray-200 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 mb-4 sm:mb-5">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
              Application Form
            </h1>
            <p className="mt-1 text-sm text-gray-500 sm:text-base">
              Fill out the form below to submit your application.
            </p>
          </div>
        </div>

        <StepIndicator currentStep={currentStep} />

        {currentStep === 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden mb-5 sm:mb-6 shadow-sm">
          <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
          <div>
            <Label>Type of Business</Label>
            <RadioGroup
              name="typeOfBusiness"
              value={typeOfBusiness}
              onChange={setTypeOfBusiness}
              options={[
                { value: 'sole', label: 'Sole Proprietorship' },
                { value: 'partnership', label: 'Partnership' },
                { value: 'corporation', label: 'Corporation' },
                { value: 'cooperative', label: 'Cooperative' },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <Label>Business Name</Label>
              <Input placeholder="Enter business name" />
            </div>
            <div>
              <Label>Trade Name (if any)</Label>
              <Input placeholder="Enter trade name" />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 pl-0 sm:border-l-4 sm:border-rose-200 sm:pl-3">
              Business Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div>
                <Label>Telephone No.</Label>
                <Input placeholder="054-XXXX-XXXX" />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="Enter email" />
              </div>
              <div>
                <Label>Mobile No.</Label>
                <Input placeholder="+63XXXXXXX" />
              </div>
              <div>
                <Label>Are you the registered owner?</Label>
                <RadioGroup
                  name="registeredOwner"
                  value={registeredOwner}
                  onChange={setRegisteredOwner}
                  options={[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ]}
                />
              </div>
              <div>
                <Label>Tax Declaration Number (TDN)</Label>
                <Input placeholder="Enter TDN" />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 pl-0 sm:border-l-4 sm:border-rose-200 sm:pl-3">
              Owner&apos;s Information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div>
                <Label>Last Name</Label>
                <Input placeholder="Last name" />
              </div>
              <div>
                <Label>First Name</Label>
                <Input placeholder="First name" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input placeholder="Middle name" />
              </div>
              <div>
                <Label>Suffix</Label>
                <Input placeholder="e.g. Jr., Sr." />
              </div>
              <div>
                <Label>Sex</Label>
                <RadioGroup
                  name="sex"
                  value={sex}
                  onChange={setSex}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input placeholder="Complete address" />
              </div>
            </div>
          </div>
          </div>
        </div>
        )}

        {currentStep === 1 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden mb-5 sm:mb-6 shadow-sm">
          <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 pl-0 sm:border-l-4 sm:border-rose-200 sm:pl-3">
              Business Address
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div>
                <Label>House/Bldg No.</Label>
                <Input placeholder="House/Building number" />
              </div>
              <div>
                <Label>Name of Building</Label>
                <Input placeholder="Building name" />
              </div>
              <div>
                <Label>Block No.</Label>
                <Input placeholder="Block number" />
              </div>
              <div>
                <Label>Lot No.</Label>
                <Input placeholder="Lot number" />
              </div>
              <div>
                <Label>Street</Label>
                <Input placeholder="Street" />
              </div>
              <div>
                <Label>Subdivision</Label>
                <Input placeholder="Subdivision" />
              </div>
              <div>
                <Label>Barangay</Label>
                <Select>
                  <option value="">Select barangay</option>
                  <option value="naga-city">Naga City</option>
                </Select>
              </div>
              <div>
                <Label>City/Municipality</Label>
                <Select>
                  <option value="">Select city</option>
                  <option value="naga-city">NAGA CITY</option>
                </Select>
              </div>
              <div>
                <Label>Province</Label>
                <Select>
                  <option value="">Select province</option>
                  <option value="camarines-sur">CAMARINES SUR</option>
                </Select>
              </div>
              <div>
                <Label>Zip Code</Label>
                <Input placeholder="4400" defaultValue="4400" />
              </div>
            </div>
            <p className="text-sm text-rose-600 mt-3 font-medium">
              Important Note: Your Business address will be reflected in the
              Mayor&apos;s Permit as shown below:
            </p>
            <div className="mt-2 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-gray-800">
              NAGA CITY, CAMARINES SUR 4400
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Please make sure that you enter the correct area and road
              classification (Block, Lot, Street, etc.) as you wished it to be
              displayed on your permit.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <Label>Business Area (in sq/m)</Label>
              <Input type="number" placeholder="Area in square meters" />
            </div>
            <div>
              <Label>Total Number of Employees in Establishment</Label>
              <Input type="number" placeholder="Total employees" />
            </div>
            <div>
              <Label>Male</Label>
              <Input type="number" placeholder="Male employees" />
            </div>
            <div>
              <Label>Female</Label>
              <Input type="number" placeholder="Female employees" />
            </div>
            <div>
              <Label>No. of Employees Residing in Naga City</Label>
              <Input type="number" placeholder="Number" />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">
              Lessor Information
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Note: Fill up only if business place is rented
            </p>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input placeholder="Lessor full name" />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input placeholder="Contact number" />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input type="email" placeholder="Email" />
              </div>
              <div>
                <Label>Complete Address</Label>
                <Input placeholder="Address" />
              </div>
              <div>
                <Label>Monthly Rental</Label>
                <Input type="number" placeholder="Amount" />
              </div>
            </div>
          </div>
          </div>
        </div>
        )}

        {currentStep === 2 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden mb-5 sm:mb-6 shadow-sm">
          <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <Label>
                Total Capital Investment (Paid-up Capital + Lease Expenses +
                Equipments)
              </Label>
              <Input type="number" placeholder="Amount" />
            </div>
            <div>
              <Label>Asset Size</Label>
              <Input placeholder="Asset size" />
            </div>
          </div>
          <div>
            <Label>Business Activity (Please check one)</Label>
            <RadioGroup
              name="businessActivity"
              value={businessActivity}
              onChange={setBusinessActivity}
              options={[
                { value: 'main', label: 'Main Office' },
                { value: 'branch', label: 'Branch' },
              ]}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto bg-rose-100 text-rose-800 hover:bg-rose-200">
                + ADD ENTRY
              </Button>
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto border-rose-300 text-rose-700 hover:bg-rose-50">
                DELETE ENTRY
              </Button>
            </div>
          </div>
          <div>
            <Label>Description of Business Operation</Label>
            <Textarea placeholder="Describe your business operation" rows={3} />
          </div>
        </div>
        </div>
        )}

        {currentStep === 3 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-4">
          <div className="p-3 space-y-3 sm:p-4 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <div>
              <Label>Applied By</Label>
              <Select>
                <option value="">Select</option>
                <option value="owner">Business Owner</option>
                <option value="representative">Representative</option>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input placeholder="Applicant name" />
            </div>
          </div>
        </div>
        </div>
        )}

        {currentStep === 4 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden mb-5 sm:mb-6 shadow-sm">
          <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
          <div>
            <Label>Attachments (upload multiple/max 10 attachments)</Label>
            <Input type="file" multiple className="mt-1" />
          </div>
          <div className="space-y-2 mt-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">
                Proof of Business Registration (DTI for Sole Proprietorship,
                SCC for Corporations and Partnerships/CDA for Cooperatives)
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">
                Consent or Lease (if leased) or Tax Declaration (if owned)
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">
                Photo of location of business *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">
                Barangay Business Clearance
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">Zoning Clearance</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">City Health Requirements</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-1 rounded border-gray-300 text-rose-600" />
              <span className="text-sm text-gray-700">
                Fire Safety Inspection Clearance (note: the nearest BFP office to
                inspect for Fire Safety Inspection Clearance or{' '}
                <Link href="#" className="text-rose-600 hover:underline">
                  click this link
                </Link>
                .)
              </span>
            </label>
          </div>
        </div>
        </div>
        )}

        {currentStep === 5 && (
        <div className="rounded-xl border-l-4 border-rose-300 bg-rose-50/40 border border-rose-100 p-4 sm:p-5 shadow-sm">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            I DECLARE UNDER PENALTY OF PERJURY that all information in this
            application are true and correct to the best of my knowledge. I
            understand that any misrepresentation may result in the denial of
            this application or revocation of any permit issued.
          </p>
          <label className="flex items-start gap-3 cursor-pointer mt-4 min-h-[2.25rem] sm:min-h-0">
            <input
              type="checkbox"
              checked={agreeDeclaration}
              onChange={(e) => setAgreeDeclaration(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-2 focus:ring-rose-500/30 focus:ring-offset-1"
            />
            <span className="text-sm text-gray-700 select-none">
              * I have read and agree to the declaration above.
            </span>
          </label>
          <div className="flex flex-col-reverse gap-3 mt-5 sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="w-full sm:w-auto h-11 rounded-lg border-gray-300"
            >
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                type="button"
                className="w-full sm:w-auto h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              >
                SAVE AS DRAFT
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                SUBMIT APPLICATION
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-11 rounded-lg border-gray-300"
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
        )}

        {currentStep < 5 && (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:gap-3 sm:justify-end mt-5 sm:mt-6 pt-1">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="w-full sm:w-auto h-11 rounded-lg border-gray-300"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              className="w-full sm:w-auto h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={goNext}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
