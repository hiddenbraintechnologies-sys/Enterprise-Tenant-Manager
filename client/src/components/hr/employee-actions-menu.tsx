import { MoreVertical, Pencil, Eye, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmployeeActionsProps = {
  canView: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
};

export function EmployeeActionsMenu(props: EmployeeActionsProps) {
  const { canView, canEdit, canDeactivate, canDelete } = props;

  const hasDestructiveActions = canDeactivate || canDelete;

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

        {canDelete && (
          <DropdownMenuItem
            onClick={props.onDelete}
            className="text-destructive focus:text-destructive"
            data-testid="menu-item-delete"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
