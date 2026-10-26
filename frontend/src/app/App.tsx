import { Component, lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Empty } from '../components/ui/Empty';
import { useApp } from '../hooks/useApp';
import { tr } from '../i18n/translate';
import { ManagementLayout } from '../layouts/ManagementLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { Root } from '../layouts/RootLayout';
import { AuthSupport } from '../pages/auth/AccountAccessPage';
import { SignIn } from '../pages/auth/SignInPage';
import { Contribute } from '../pages/community/ContributePage';
import { PublicForm } from '../pages/community/RequestFormPage';
import { RequestStatus } from '../pages/community/RequestStatusPage';
import { PublicNotices } from '../pages/public/NoticesPage';

import { Coverage } from '../pages/public/CoveragePage';
import { Directions } from '../pages/public/DirectionsPage';
import { Home } from '../pages/public/HomePage';
import { Information } from '../pages/public/InformationPage';
import { LocationPage } from '../pages/public/LocationPage';
import { MosqueDetails } from '../pages/public/MosqueDetailsPage';
import { NoticeDetail } from '../pages/public/NoticeDetailsPage';
import { Results } from '../pages/public/ResultsPage';
import { SessionDetails } from '../pages/public/SessionDetailsPage';
import { Provider } from './providers/AppProvider';
const AccountDetails = lazy(() =>
  import('../pages/management/AccountDetailsPage').then((module) => ({
    default: module.AccountDetails,
  })),
);
const Accounts = lazy(() =>
  import('../pages/management/AccountsPage').then((module) => ({
    default: module.Accounts,
  })),
);
const Activity = lazy(() =>
  import('../pages/management/ActivityPage').then((module) => ({
    default: module.Activity,
  })),
);
const Areas = lazy(() =>
  import('../pages/management/AreasPage').then((module) => ({ default: module.Areas })),
);
const Assignments = lazy(() =>
  import('../pages/management/AssignmentsPage').then((module) => ({
    default: module.Assignments,
  })),
);
const Dashboard = lazy(() =>
  import('../pages/management/DashboardPage').then((module) => ({
    default: module.Dashboard,
  })),
);
const Delivery = lazy(() =>
  import('../pages/management/DeliveryPage').then((module) => ({
    default: module.Delivery,
  })),
);
const Duplicates = lazy(() =>
  import('../pages/management/DuplicatesPage').then((module) => ({
    default: module.Duplicates,
  })),
);
const Escalations = lazy(() =>
  import('../pages/management/EscalationsPage').then((module) => ({
    default: module.Escalations,
  })),
);
const InvitationForm = lazy(() =>
  import('../pages/management/InvitationFormPage').then((module) => ({
    default: module.InvitationForm,
  })),
);
const Maintenance = lazy(() =>
  import('../pages/management/MaintenancePage').then((module) => ({
    default: module.Maintenance,
  })),
);
const MyAccount = lazy(() =>
  import('../pages/management/MyAccountPage').then((module) => ({
    default: module.MyAccount,
  })),
);
const NoticeForm = lazy(() =>
  import('../pages/management/NoticeFormPage').then((module) => ({
    default: module.NoticeForm,
  })),
);
const Notices = lazy(() =>
  import('../pages/management/NoticesPage').then((module) => ({
    default: module.Notices,
  })),
);
const Notifications = lazy(() =>
  import('../pages/management/NotificationsPage').then((module) => ({
    default: module.Notifications,
  })),
);
const ProfileForm = lazy(() =>
  import('../pages/management/ProfileFormPage').then((module) => ({
    default: module.ProfileForm,
  })),
);
const RecordQueue = lazy(() =>
  import('../pages/management/RecordQueuePage').then((module) => ({
    default: module.RecordQueue,
  })),
);
const Registration = lazy(() =>
  import('../pages/management/RegistrationPage').then((module) => ({
    default: module.Registration,
  })),
);
const RequestReview = lazy(() =>
  import('../pages/management/RequestReviewPage').then((module) => ({
    default: module.RequestReview,
  })),
);
const ReviewChanges = lazy(() =>
  import('../pages/management/ReviewChangesPage').then((module) => ({
    default: module.ReviewChanges,
  })),
);
const ReviewQueue = lazy(() =>
  import('../pages/management/ReviewQueuePage').then((module) => ({
    default: module.ReviewQueue,
  })),
);
const SubmissionDetail = lazy(() =>
  import('../pages/management/SubmissionDetailPage').then((module) => ({
    default: module.SubmissionDetail,
  })),
);
const Submissions = lazy(() =>
  import('../pages/management/SubmissionsPage').then((module) => ({
    default: module.Submissions,
  })),
);
const TimetableEditor = lazy(() =>
  import('../pages/management/TimetableEditorPage').then((module) => ({
    default: module.TimetableEditor,
  })),
);
const VenueList = lazy(() =>
  import('../pages/management/VenueListPage').then((module) => ({
    default: module.VenueList,
  })),
);
const VenueOverview = lazy(() =>
  import('../pages/management/VenueOverviewPage').then((module) => ({
    default: module.VenueOverview,
  })),
);
const Verification = lazy(() =>
  import('../pages/management/VerificationPage').then((module) => ({
    default: module.Verification,
  })),
);

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container narrow">
        <h1>{tr('We couldn’t display this page')}</h1>
        <p>{tr('Reload to retrieve the current records from the server.')}</p>
        <button onClick={() => window.location.reload()}>{tr('Reload page')}</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function MissingPage({ management = false }: { management?: boolean }) {
  const { t } = useApp();
  return (
    <Empty
      title={
        management
          ? t('Workspace page not found', 'انتظامی صفحہ نہیں ملا')
          : t('Page not found', 'صفحہ نہیں ملا')
      }
      action={
        <ButtonLink to={management ? '/manage' : '/'}>
          {t('Return home', 'ہوم پر واپس')}
        </ButtonLink>
      }
    />
  );
}
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={
        <Provider>
          <Root />
        </Provider>
      }
    >
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="results" element={<Results />} />
        <Route path="map" element={<Results map />} />
        <Route path="location" element={<LocationPage />} />
        <Route path="mosque/:id" element={<MosqueDetails />} />
        <Route path="mosque/:id/session" element={<SessionDetails />} />
        <Route path="mosque/:id/directions" element={<Directions />} />
        <Route path="contribute" element={<Contribute />} />
        <Route path="apply" element={<PublicForm kind="application" />} />
        <Route path="suggest" element={<PublicForm kind="suggestion" />} />
        <Route path="report" element={<PublicForm kind="report" />} />
        <Route path="contact" element={<PublicForm kind="contact" />} />
        <Route path="receipt/:id" element={<RequestStatus receipt />} />
        <Route path="track" element={<RequestStatus />} />
        <Route path="coverage" element={<Coverage />} />
        <Route path="notices" element={<PublicNotices />} />
        <Route path="notice/:id" element={<NoticeDetail />} />
        {[
          'about',
          'how-it-works',
          'help',
          'timing-status',
          'privacy',
          'terms',
          'guidelines',
          'accessibility',
        ].map((page) => (
          <Route key={page} path={page} element={<Information page={page} />} />
        ))}
        <Route path="sign-in" element={<SignIn />} />
        <Route path="recovery" element={<AuthSupport mode="recovery" />} />
        <Route path="reset-password" element={<AuthSupport mode="reset" />} />
        <Route path="invitation" element={<AuthSupport mode="invite" />} />
        <Route path="mfa" element={<AuthSupport mode="mfa" />} />
        <Route path="session-expired" element={<AuthSupport mode="expired" />} />
        <Route path="access-unavailable" element={<AuthSupport mode="denied" />} />
        <Route path="*" element={<MissingPage />} />
      </Route>
      <Route path="manage" element={<ManagementLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="mosques" element={<VenueList />} />
        <Route path="mosques/:id" element={<VenueOverview />} />
        <Route path="mosques/:id/edit" element={<TimetableEditor />} />
        <Route path="mosques/:id/review-changes" element={<ReviewChanges />} />
        <Route path="mosques/:id/profile" element={<ProfileForm />} />
        <Route path="mosques/:id/contact" element={<ProfileForm contact />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="submissions/:id" element={<SubmissionDetail />} />
        <Route path="reviews" element={<ReviewQueue />} />
        <Route path="review/:id" element={<Verification />} />
        <Route path="register" element={<Registration />} />
        <Route path="registrations/:id/edit" element={<Registration />} />
        <Route path="reports" element={<RecordQueue kind="report" />} />
        <Route path="suggestions" element={<RecordQueue kind="suggestion" />} />
        <Route path="applications" element={<RecordQueue kind="application" />} />
        <Route path="registrations" element={<RecordQueue kind="registration" />} />
        <Route path="contact-changes" element={<RecordQueue kind="contact-change" />} />
        <Route path="profile-changes" element={<RecordQueue kind="profile-change" />} />
        <Route path="requests/:id" element={<RequestReview />} />
        <Route path="notices" element={<Notices />} />
        <Route path="notices/new" element={<NoticeForm />} />
        <Route path="notices/:id/edit" element={<NoticeForm />} />
        <Route path="representatives" element={<Accounts representatives />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:id" element={<AccountDetails />} />
        <Route path="accounts/invite" element={<InvitationForm />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="areas" element={<Areas />} />
        <Route path="history" element={<Activity />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="account" element={<MyAccount />} />
        <Route path="duplicates" element={<Duplicates />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="*" element={<MissingPage management />} />
      </Route>
    </Route>,
  ),
);
export function App() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="container narrow" role="status" aria-live="polite">
            {'Loading workspace… / ورک اسپیس لوڈ ہو رہی ہے…'}{' '}
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
}
