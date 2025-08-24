
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Plus,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  Eye,
  Settings
} from 'lucide-react';
import { ACTION_TRANSLATIONS } from '@/utils/constants';
import { LoadingButton } from './loading-states';

interface ActionButtonProps {
  action: keyof typeof ACTION_TRANSLATIONS;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
}

const ACTION_ICONS = {
  create: Plus,
  edit: Edit,
  delete: Trash2,
  submit: Check,
  save: Save,
  cancel: X,
  approve: Check,
  reject: X,
  accept: Check,
  decline: X,
  start: Plus,
  complete: Check,
  update: RefreshCw,
  upload: Upload,
  download: Download,
  export: Download,
  import: Upload,
  search: Search,
  filter: Filter,
  clear: X,
  refresh: RefreshCw,
  retry: RefreshCw
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  action,
  onClick,
  disabled,
  isLoading,
  variant = 'default',
  size = 'default',
  className,
  showIcon = true
}) => {
  const Icon = ACTION_ICONS[action];
  const label = ACTION_TRANSLATIONS[action];

  if (isLoading) {
    return (
      <LoadingButton
        isLoading={isLoading}
        loadingText={`A ${label.toLowerCase()}...`}
        onClick={onClick}
        className={className}
        disabled={disabled}
      >
        {showIcon && Icon && <Icon className="h-4 w-4" />}
        {size !== 'icon' && label}
      </LoadingButton>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {showIcon && Icon && <Icon className="h-4 w-4" />}
      {size !== 'icon' && <span className={showIcon ? 'ml-2' : ''}>{label}</span>}
    </Button>
  );
};

// Specific action button variants
export const SaveButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="save" variant="default" {...props} />
);

export const CancelButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="cancel" variant="outline" {...props} />
);

export const DeleteButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="delete" variant="destructive" {...props} />
);

export const EditButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="edit" variant="outline" {...props} />
);

export const CreateButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="create" variant="default" {...props} />
);

export const ApproveButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="approve" variant="default" {...props} />
);

export const RejectButton: React.FC<Omit<ActionButtonProps, 'action'>> = (props) => (
  <ActionButton action="reject" variant="destructive" {...props} />
);
