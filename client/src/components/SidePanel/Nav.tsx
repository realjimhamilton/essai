import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import {
  AccordionContent,
  AccordionItem,
  TooltipAnchor,
  Accordion,
  Button,
} from '@librechat/client';
import type { NavLink, NavProps } from '~/common';
import { ActivePanelProvider, useActivePanel } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

// Wrapper component to force icon color with normal stroke width
const ColoredIcon = ({ Icon, className, ...props }: { Icon: React.ElementType; className?: string; [key: string]: any }) => {
  const iconRef = React.useRef<HTMLDivElement>(null);
  const isUpdatingRef = React.useRef(false);
  
  React.useEffect(() => {
    const updateStroke = () => {
      if (isUpdatingRef.current || !iconRef.current) return;
      
      const svg = iconRef.current.querySelector('svg');
      if (svg) {
        isUpdatingRef.current = true;
        
          // Force stroke-width to 1.0 by overriding everything
          // Also remove any classes that might set stroke-width
          svg.className.baseVal = svg.className.baseVal.replace(/icon-\w+/g, '').trim();
          svg.setAttribute('stroke-width', '1');
          svg.style.setProperty('stroke-width', '1', 'important');
          
          // Force stroke color and line cap
          svg.setAttribute('stroke', '#43b7a1');
          svg.setAttribute('stroke-linecap', 'round');
          svg.style.setProperty('stroke', '#43b7a1', 'important');
          svg.style.setProperty('color', '#43b7a1', 'important');
          
          // Force on all child elements - be very aggressive
          const allElements = svg.querySelectorAll('*');
          allElements.forEach((el) => {
            const svgEl = el as SVGElement;
            // Remove any stroke-width attributes first
            if (svgEl.hasAttribute('stroke-width')) {
              svgEl.removeAttribute('stroke-width');
            }
            svgEl.setAttribute('stroke-width', '1');
            svgEl.setAttribute('stroke', '#43b7a1');
            // Set both inline style and CSS property
            svgEl.style.cssText = `stroke: #43b7a1 !important; stroke-width: 1 !important;`;
          });
        
        // Use requestAnimationFrame to reset flag after DOM updates
        requestAnimationFrame(() => {
          isUpdatingRef.current = false;
        });
      }
    };
    
    updateStroke();
    
    // Single delayed update to catch any late renders
    const timeout = setTimeout(updateStroke, 100);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [Icon]);
  
  return (
    <div 
      ref={iconRef}
      style={{ 
        color: '#43b7a1',
        display: 'inline-block',
        lineHeight: 0
      }}
      className={cn('h-4 w-4', className)}
    >
      <Icon {...props} color="#43b7a1" strokeWidth={1} strokeLinecap="round" size={16} />
    </div>
  );
};

function NavContent({ links, isCollapsed, resize }: Omit<NavProps, 'defaultActive'>) {
  const localize = useLocalize();
  const { active, setActive } = useActivePanel();
  const getVariant = (link: NavLink) => (link.id === active ? 'default' : 'ghost');

  return (
    <div
      data-collapsed={isCollapsed}
      data-sidebar-nav="true"
      className="bg-token-sidebar-surface-primary hide-scrollbar group flex-shrink-0 overflow-x-hidden"
    >
      <div className="h-full">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-full min-h-0 flex-col opacity-100 transition-opacity">
            <div className="scrollbar-trigger relative h-full w-full flex-1 items-start border-white/20">
              <div className="flex h-full w-full flex-col gap-1 px-3 py-2.5 group-[[data-collapsed=true]]:items-center group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
                {links.map((link, index) => {
                  const variant = getVariant(link);
                  return isCollapsed ? (
                    <TooltipAnchor
                      description={localize(link.title)}
                      side="left"
                      key={`nav-link-${index}`}
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            if (link.onClick) {
                              link.onClick(e);
                              setActive('');
                              return;
                            }
                            setActive(link.id);
                            resize && resize(25);
                          }}
                          className="text-accent [&_svg]:stroke-accent"
                          style={{ color: '#43b7a1' }}
                        >
                          <ColoredIcon Icon={link.icon} size={16} />
                          <span className="sr-only">{localize(link.title)}</span>
                        </Button>
                      }
                    />
                  ) : (
                    <Accordion
                      key={index}
                      type="single"
                      value={active}
                      onValueChange={setActive}
                      collapsible
                    >
                      <AccordionItem value={link.id} className="w-full border-none">
                        <AccordionPrimitive.Header asChild>
                          <AccordionPrimitive.Trigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start bg-transparent text-white hover:bg-accent hover:text-white data-[state=open]:bg-accent data-[state=open]:text-white [&_svg]:stroke-accent"
                              onClick={(e) => {
                                if (link.onClick) {
                                  link.onClick(e);
                                  setActive('');
                                }
                              }}
                            >
                              <ColoredIcon Icon={link.icon} className="mr-2" size={16} aria-hidden="true" />
                              <span className="text-white">{localize(link.title)}</span>
                              {link.label != null && link.label && (
                                <span
                                  className={cn(
                                    'ml-auto opacity-100 transition-all duration-300 ease-in-out',
                                    variant === 'default' ? 'text-text-primary' : '',
                                  )}
                                >
                                  {link.label}
                                </span>
                              )}
                            </Button>
                          </AccordionPrimitive.Trigger>
                        </AccordionPrimitive.Header>

                        <AccordionContent className="bg-token-sidebar-surface-primary w-full text-text-primary">
                          {link.Component && <link.Component />}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Nav({ links, isCollapsed, resize, defaultActive }: NavProps) {
  return (
    <ActivePanelProvider defaultActive={defaultActive}>
      <NavContent links={links} isCollapsed={isCollapsed} resize={resize} />
    </ActivePanelProvider>
  );
}
