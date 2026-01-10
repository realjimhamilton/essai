import { Navigate } from 'react-router-dom';
import {
  PromptsView,
  PromptForm,
  CreatePromptForm,
  EmptyPromptPreview,
} from '~/components/Prompts';
import CostTrackingView from '~/components/CostTracking/CostTrackingView';
import DashboardRoute from './Layouts/Dashboard';
import { useAuthContext } from '~/hooks';
import { SystemRoles } from 'librechat-data-provider';

function AdminProtectedCostTracking() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === SystemRoles.ADMIN;
  
  if (!isAdmin) {
    return <Navigate to="/" replace={true} />;
  }
  
  return <CostTrackingView />;
}

const dashboardRoutes = {
  path: 'd/*',
  element: <DashboardRoute />,
  children: [
    /*
    {
      element: <FileDashboardView />,
      children: [
        {
          index: true,
          element: <EmptyVectorStorePreview />,
        },
        {
          path: ':vectorStoreId',
          element: <DataTableFilePreview />,
        },
      ],
    },
    {
      path: 'files/*',
      element: <FilesListView />,
      children: [
        {
          index: true,
          element: <EmptyFilePreview />,
        },
        {
          path: ':fileId',
          element: <FilePreview />,
        },
      ],
    },
    {
      path: 'vector-stores/*',
      element: <VectorStoreView />,
      children: [
        {
          index: true,
          element: <EmptyVectorStorePreview />,
        },
        {
          path: ':vectorStoreId',
          element: <VectorStorePreview />,
        },
      ],
    },
    */
    {
      path: 'prompts/*',
      element: <PromptsView />,
      children: [
        {
          index: true,
          element: <EmptyPromptPreview />,
        },
        {
          path: 'new',
          element: <CreatePromptForm />,
        },
        {
          path: ':promptId',
          element: <PromptForm />,
        },
      ],
    },
    {
      path: 'cost-tracking',
      element: <AdminProtectedCostTracking />,
    },
    {
      path: '*',
      element: <Navigate to="/d/prompts" replace={true} />,
    },
  ],
};

export default dashboardRoutes;
