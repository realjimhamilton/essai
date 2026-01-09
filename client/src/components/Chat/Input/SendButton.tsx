import React, { forwardRef } from 'react';
import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { SendIcon, TooltipAnchor } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type SendButtonProps = {
  disabled: boolean;
  control: Control<{ text: string }>;
};

const SubmitButton = React.memo(
  forwardRef((props: { disabled: boolean }, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const localize = useLocalize();
    return (
      <TooltipAnchor
        description={localize('com_nav_send_message')}
        render={
          <button
            ref={ref}
            aria-label={localize('com_nav_send_message')}
            id="send-button"
            disabled={props.disabled}
            style={{ backgroundColor: '#43b7a1' }}
            className={cn(
              'rounded-full p-1.5 outline-offset-4 transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50',
            )}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#389f8c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#43b7a1';
            }}
            data-testid="send-button"
            type="submit"
          >
            <span className="text-white" data-state="closed">
              <SendIcon size={24} className="!text-white" />
            </span>
          </button>
        }
      />
    );
  }),
);

const SendButton = React.memo(
  forwardRef((props: SendButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const data = useWatch({ control: props.control });
    return <SubmitButton ref={ref} disabled={props.disabled || !data.text} />;
  }),
);

export default SendButton;
