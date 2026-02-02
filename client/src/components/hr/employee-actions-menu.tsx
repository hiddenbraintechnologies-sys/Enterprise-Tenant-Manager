import { MoreVertical, Pencil, Eye, Trash2, UserX, UserCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type EmployeeActionsProps = {
  canView: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canReactivate: boolean;
  canDelete: boolean;
  isAddonExpired?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
};

export function EmployeeActionsMenu(props: EmployeeActionsProps) {
  const { canView, canEdit, canDeactivate, canReactivate, canDelete, isAddonExpired } = props;

  const hasDestructiveActions = canDeactivate || canReactivate || canDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Employee actions"
          data-testid="button-employee-actions"
          data-menu-trigger="true"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48" data-menu-content="true">
        {canView && (
          <DropdownMenuItem onClick={props.onView} data-testid="menu-item-view">
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
        )}

        {canEdit && (
          <DropdownMenuItem onClick={props.onEdit} data-testid="menu-item-edit">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}

        {hasDestructiveActions && <DropdownMenuSeparator />}

        {canDeactivate && (
          <DropdownMenuItem onClick={props.onDeactivate} data-testid="menu-item-deactivate">
            <UserX className="mr-2 h-4 w-4" />
            Deactivate
          </DropdownMenuItem>
        )}

        {canReactivate && (
          <DropdownMenuItem onClick={props.onReactivate} data-testid="menu-item-reactivate">
            <UserCheck className="mr-2 h-4 w-4" />
            Reactivate
          </DropdownMenuItem>
        )}

        {canDelete && (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={props.onDelete}
                className="text-destructive focus:text-destructive"
                data-testid="menu-item-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete permanently
                {isAddonExpired && <Info className="ml-auto h-3 w-3 opacity-50" />}
              </DropdownMenuItem>
            </TooltipTrigger>
            {isAddonExpired && (
              <TooltipContent side="left">
                <p className="text-xs">Cleanup allowed even when HRMS subscription is inactive</p>
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
