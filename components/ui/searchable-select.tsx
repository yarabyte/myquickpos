"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type SearchableSelectOption = {
  value: string
  label: string
  keywords?: string
}

export type SearchableSelectGroup = {
  label: string
  options: SearchableSelectOption[]
}

type SearchableSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options?: SearchableSelectOption[]
  groups?: SearchableSelectGroup[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .trim()
}

function optionMatchesQuery(option: SearchableSelectOption, query: string): boolean {
  if (!query) return true
  const haystack = normalizeSearch(`${option.keywords ?? ""} ${option.label}`)
  const needle = normalizeSearch(query)
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

export function SearchableSelect({
  value,
  onValueChange,
  options = [],
  groups,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  emptyText = "Aucun résultat",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const flatOptions = groups ? groups.flatMap((g) => g.options) : options
  const selected = flatOptions.find((o) => o.value === value)
  const displayLabel =
    value === "" ? options.find((o) => o.value === "")?.label ?? placeholder : selected?.label ?? placeholder

  const filteredOptions = useMemo(
    () => options.filter((o) => optionMatchesQuery(o, search)),
    [options, search]
  )

  const filteredGroups = useMemo(
    () =>
      groups
        ?.map((group) => ({
          ...group,
          options: group.options.filter((o) => optionMatchesQuery(o, search)),
        }))
        .filter((group) => group.options.length > 0) ?? [],
    [groups, search]
  )

  const hasResults = groups
    ? filteredOptions.length > 0 || filteredGroups.length > 0
    : filteredOptions.length > 0

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch("")
  }

  function renderOption(option: SearchableSelectOption) {
    return (
      <CommandItem
        key={option.value || "__empty__"}
        value={option.value || "__empty__"}
        onSelect={() => {
          onValueChange(option.value)
          setOpen(false)
          setSearch("")
        }}
      >
        <Check
          className={cn("mr-2 h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")}
        />
        <span className="truncate">{option.label}</span>
      </CommandItem>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full min-w-0 justify-between font-normal bg-secondary border-border text-card-foreground h-10 px-3",
            !selected && value !== "" && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[200]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!hasResults && <CommandEmpty>{emptyText}</CommandEmpty>}
            {groups ? (
              <>
                {filteredOptions.length > 0 && (
                  <CommandGroup>{filteredOptions.map(renderOption)}</CommandGroup>
                )}
                {filteredGroups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map(renderOption)}
                  </CommandGroup>
                ))}
              </>
            ) : (
              hasResults && <CommandGroup>{filteredOptions.map(renderOption)}</CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
