import { MapPinned, TriangleAlert, Unplug } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import type { CSSProperties } from 'react';

import {
  errorMessage,
  isUnreachableError,
  UNREACHABLE_HINT,
  UNREACHABLE_TITLE,
} from '@/api/client';
import { AppHeader } from '@/components/layout/AppHeader';
import { LazyTrailMap } from '@/components/map/LazyTrailMap';
import type { MapPadding } from '@/components/map/types';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { RoutePoint } from '@/lib/route';
import { useTheme } from '@/theme/useTheme';

import { COPILOT_BUTTON_ID, CopilotButton } from '@/features/copilot/components/CopilotButton';
import { CopilotPanel } from '@/features/copilot/components/CopilotPanel';
import { useCopilot } from '@/features/copilot/hooks/useCopilot';

import { ElevationPanel } from './components/ElevationPanel';
import { PointDetails } from './components/PointDetails';
import { PlanControlsPanel } from './components/PlanControlsPanel';
import { ShareButton } from './components/ShareButton';
import { VerdictPanel } from './components/VerdictPanel';
import { usePlannerData } from './hooks/usePlannerData';
import { usePlannerState } from './hooks/usePlannerState';

/*
 * Wide-screen geometry (≥ 1024 px): the map fills the window and the panels float over it.
 * The same numbers size the grid (through CSS variables) and keep the route clear of the panels.
 */
const HEADER_HEIGHT = 56;
const GUTTER = 16;
const LEFT_PANEL_WIDTH = 360;
const RIGHT_PANEL_WIDTH = 340;
const BOTTOM_PANEL_HEIGHT = 172;
/** Extra space between the route and the nearest panel edge. */
const ROUTE_MARGIN = 32;

const PANEL_SIZES: CSSProperties = {
  '--left-panel': `${LEFT_PANEL_WIDTH}px`,
  '--right-panel': `${RIGHT_PANEL_WIDTH}px`,
  '--bottom-panel': `${BOTTOM_PANEL_HEIGHT}px`,
};

const DESKTOP_MAP_PADDING: MapPadding = {
  top: HEADER_HEIGHT + ROUTE_MARGIN,
  right: GUTTER + RIGHT_PANEL_WIDTH + ROUTE_MARGIN,
  bottom: GUTTER + BOTTOM_PANEL_HEIGHT + ROUTE_MARGIN,
  left: GUTTER + LEFT_PANEL_WIDTH + ROUTE_MARGIN,
};

/** Below 1024 px the map is a 42 vh band; the bottom margin clears the open attribution. */
const PHONE_MAP_PADDING: MapPadding = { top: 32, right: 32, bottom: 64, left: 32 };

const NO_POINTS: readonly RoutePoint[] = [];

/** Panels rise into place on first load. */
const PANEL_ENTRANCE = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

/** The route point being inspected, and where the hiker picked it (which decides where its card shows). */
interface ActivePoint {
  trailId: string;
  index: number;
  source: 'profile' | 'map';
}

export function PlannerPage() {
  useDocumentTitle();
  const { state, actions } = usePlannerState();
  const data = usePlannerData(state);
  const { resolvedTheme } = useTheme();
  const isDesktop = useIsDesktop();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);
  const copilot = useCopilot({
    context: data.planRequest,
    onSuggestion: (request) => {
      actions.applyRequest(request, data.today);
    },
  });

  const { health, trails, sweep, plan, route, selectedTrail } = data;
  const currentPlanId = plan.isPlaceholderData ? undefined : plan.data?.plan_id;
  const startupError = health.error ?? trails.error;
  // The snow line belongs to the plan's trail; hide it while another trail's route is shown.
  const snowLineM =
    plan.data && plan.data.trail.id === route?.trailId ? plan.data.summary.snow_line_m : null;
  const hasNoTrails = trails.data?.length === 0;

  // Times and conditions per point exist only when the route on screen comes from a plan.
  const pointDetails =
    plan.data && plan.data.trail.id === route?.trailId ? plan.data.points : undefined;
  // A selection made on another trail's route no longer applies.
  const active =
    activePoint?.trailId === route?.trailId && pointDetails?.[activePoint?.index ?? -1]
      ? activePoint
      : null;
  const activeDetails = active ? pointDetails?.[active.index] : undefined;
  const selectPoint = (source: ActivePoint['source']) => (index: number | null) => {
    setActivePoint(index === null || !route ? null : { trailId: route.trailId, index, source });
  };

  const closeCopilot = () => {
    setCopilotOpen(false);
    document.getElementById(COPILOT_BUTTON_ID)?.focus();
  };

  const retryStartup = () => {
    void health.refetch();
    void trails.refetch();
  };

  return (
    <div
      style={PANEL_SIZES}
      className="relative flex min-h-dvh flex-col lg:block lg:h-dvh lg:overflow-hidden"
    >
      <AppHeader
        className="sticky top-0 lg:absolute lg:inset-x-0"
        actions={
          <>
            <CopilotButton
              open={copilotOpen}
              onToggle={() => {
                setCopilotOpen((open) => !open);
              }}
            />
            <ShareButton planId={currentPlanId} />
          </>
        }
      />
      <LazyTrailMap
        points={route?.points ?? NO_POINTS}
        routeKey={route?.trailId}
        theme={resolvedTheme}
        padding={isDesktop ? DESKTOP_MAP_PADDING : PHONE_MAP_PADDING}
        label={selectedTrail ? `Map of ${selectedTrail.name}` : 'Trail map'}
        cooperativeGestures={!isDesktop}
        activeIndex={active?.index ?? null}
        onPointSelect={pointDetails ? selectPoint('map') : undefined}
        popup={
          active?.source === 'map' && activeDetails ? (
            <PointDetails point={activeDetails} className="pr-6" />
          ) : null
        }
        onPopupClose={() => {
          setActivePoint(null);
        }}
        className="h-[42vh] shrink-0 lg:absolute lg:inset-0 lg:h-auto"
      />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-14 lg:bottom-0 lg:grid lg:w-auto lg:max-w-none lg:grid-cols-[var(--left-panel)_minmax(0,1fr)_var(--right-panel)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4 lg:p-4">
        <h1 className="sr-only">Plan a North Shore hike</h1>
        {startupError || hasNoTrails ? (
          <Panel
            floating
            {...PANEL_ENTRANCE}
            className="pointer-events-auto px-6 py-10 lg:col-span-3 lg:row-span-2 lg:w-[380px] lg:place-self-center"
          >
            {startupError ? (
              <StartupError error={startupError} onRetry={retryStartup} />
            ) : (
              <StatusMessage
                icon={MapPinned}
                title="No trails to plan yet"
                message="The planner doesn’t have any trails loaded."
                action={
                  <Button variant="secondary" onClick={retryStartup}>
                    Try again
                  </Button>
                }
              />
            )}
          </Panel>
        ) : (
          <>
            <VerdictPanel
              {...PANEL_ENTRANCE}
              plan={plan.data}
              isStale={plan.isPlaceholderData}
              isOtherTrailOrDay={
                plan.data !== undefined &&
                (plan.data.trail.id !== data.trailId || plan.data.request.date !== data.date)
              }
              error={plan.error}
              onRetry={() => {
                void plan.refetch();
              }}
              className="pointer-events-auto lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:max-h-full lg:self-start lg:overflow-y-auto"
            />
            <PlanControlsPanel
              {...PANEL_ENTRANCE}
              state={state}
              actions={actions}
              trails={trails.data}
              trailId={data.trailId}
              date={data.date}
              start={data.start}
              sweep={sweep.data}
              sweepIsStale={sweep.isPlaceholderData}
              sweepError={sweep.error}
              onRetrySweep={() => {
                void sweep.refetch();
              }}
              className="pointer-events-auto lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-h-full lg:self-start lg:overflow-y-auto"
            />
            <ElevationPanel
              {...PANEL_ENTRANCE}
              points={route?.points}
              snowLineM={snowLineM}
              details={pointDetails}
              activeIndex={active?.index ?? null}
              showCard={active?.source === 'profile'}
              onActiveIndexChange={selectPoint('profile')}
              className="pointer-events-auto lg:col-start-2 lg:row-start-2 lg:h-(--bottom-panel) lg:w-full lg:max-w-3xl lg:justify-self-center"
            />
          </>
        )}
      </main>
      <AnimatePresence>
        {copilotOpen && (
          <CopilotPanel
            copilot={copilot}
            enabled={health.data?.copilot_enabled !== false}
            isDesktop={isDesktop}
            onClose={closeCopilot}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StartupError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const unreachable = isUnreachableError(error);

  return (
    <StatusMessage
      alert
      icon={unreachable ? Unplug : TriangleAlert}
      title={unreachable ? UNREACHABLE_TITLE : 'The planner hit a problem'}
      message={unreachable ? UNREACHABLE_HINT : errorMessage(error)}
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  );
}
