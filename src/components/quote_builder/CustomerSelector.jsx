import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Building, Mail, Phone, MapPin, Plus, Check, ChevronsUpDown } from "lucide-react";

export default function CustomerSelector({ customers, selectedCustomer, setSelectedCustomer, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          Customer
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between clay-inset bg-white/60 border-none rounded-2xl h-12"
              disabled={disabled}
            >
              {selectedCustomer ? selectedCustomer.company_name : "Select customer..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="clay-shadow border-none rounded-2xl p-0 w-96" align="start">
            <Command>
              <CommandInput placeholder="Search customer..." />
              <CommandList>
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        setSelectedCustomer(customer);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold">{customer.company_name}</span>
                        <span className="text-sm text-slate-500">{customer.contact_person}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedCustomer && (
          <div className="mt-4 p-4 clay-inset bg-blue-50/50 rounded-2xl">
            <h4 className="font-bold text-lg text-slate-800 mb-3">{selectedCustomer.company_name}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                <span>{selectedCustomer.contact_person}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{selectedCustomer.email}</span>
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
              {selectedCustomer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{selectedCustomer.address}</span>
                </div>
              )}
            </div>
            {selectedCustomer.vat_number && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">VAT: {selectedCustomer.vat_number}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}