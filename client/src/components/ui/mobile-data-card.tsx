import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface DataField {
  label: string
  value: React.ReactNode
}

export interface DataCardAction {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
}

interface MobileDataCardProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  status?: {
    label: string
    variant?: "default" | "secondary" | "destructive" | "outline"
  }
  fields: DataField[]
  primaryAction?: DataCardAction
  secondaryActions?: DataCardAction[]
  className?: string
  onClick?: () => void
  testId?: string
}

export function MobileDataCard({
  title,
  subtitle,
  status,
  fields,
  primaryAction,
  secondaryActions,
  className,
  onClick,
  testId,
}: MobileDataCardProps) {
  return (
    <Card 
      className={cn("hover-elevate", onClick && "cursor-pointer", className)} 
      onClick={onClick}
      data-testid={testId}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate" data-testid={testId ? `${testId}-title` : undefined}>
              {title}
            </div>
            {subtitle && (
              <div className="text-sm text-muted-foreground truncate" data-testid={testId ? `${testId}-subtitle` : undefined}>
                {subtitle}
              </div>
            )}
          </div>
          {status && (
            <Badge variant={status.variant || "secondary"} data-testid={testId ? `${testId}-status` : undefined}>
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {fields.map((field, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-muted-foreground text-xs">{field.label}</span>
              <span className="font-medium truncate">{field.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
      {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
          {primaryAction && (
            <Button
              variant={primaryAction.variant || "default"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                primaryAction.onClick()
              }}
              className="flex-1"
              data-testid={testId ? `${testId}-primary-action` : undefined}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {secondaryActions && secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={testId ? `${testId}-more-actions` : undefined}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondaryActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                    data-testid={testId ? `${testId}-action-${index}` : undefined}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

interface ResponsiveDataListProps<T> {
  data: T[]
  isLoading?: boolean
  emptyState?: React.ReactNode
  renderTable: () => React.ReactNode
  renderCard: (item: T, index: number) => React.ReactNode
  className?: string
}

export function ResponsiveDataList<T>({
  data,
  isLoading,
  emptyState,
  renderTable,
  renderCard,
  className,
}: ResponsiveDataListProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className={className}>
      <div className="hidden md:block">
        {renderTable()}
      </div>
      <div className="md:hidden space-y-3">
        {data.map((item, index) => renderCard(item, index))}
      </div>
    </div>
  )
}
