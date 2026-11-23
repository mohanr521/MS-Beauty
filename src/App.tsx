import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { AppointmentsSection } from './components/AppointmentsSection.tsx';
import { BookingSection } from './components/BookingSection.tsx';
import { Footer } from './components/Footer.tsx';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ServiceDetailModal } from './components/ServiceDetailModal.tsx';
import { ServicesGallery } from './components/ServicesGallery.tsx';
import { SpecialistsPage } from './components/SpecialistsPage.tsx';
import { ADMIN_EMAIL, auth, googleProvider, testConnection } from './firebase.ts';
import type { Appointment, ServiceItem, Specialist } from './types/parlour.ts';
import { formatUserFacingError } from './utils/firestoreErrors.ts';
import {
  ensureCatalogSeeded,
  subscribeServices,
  subscribeSpecialists,
} from './utils/firestoreService.ts';
import type { AppPage } from './utils/routing.ts';
import { parsePageFromPath, pathForPage } from './utils/routing.ts';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() =>
    parsePageFromPath(window.location.pathname)
  );
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [catalogSynced, setCatalogSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detailService, setDetailService] = useState<ServiceItem | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<number>(1);

  const [activeLookupQuery, setActiveLookupQuery] = useState<string>('');

  const isAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  const navigateTo = useCallback((page: AppPage) => {
    const targetPath = pathForPage(page);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(parsePageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    void testConnection();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        ensureCatalogSeeded(nextUser.email).catch((err) => {
          console.error('Catalog sync warning:', err);
        });
      }
    });
    return () => unsub();
  }, []);

  const attachCatalogListeners = useCallback(() => {
    setLoading(true);
    setLoadError(null);

    let servicesLoaded = false;
    let specialistsLoaded = false;

    const markReady = () => {
      if (servicesLoaded && specialistsLoaded) {
        setLoading(false);
      }
    };

    const unsubServices = subscribeServices(
      (items, synced) => {
        setServices(items);
        setCatalogSynced(synced);
        if (items.length > 0) {
          setSelectedServiceId((prev) =>
            items.some((s) => s.id === prev) ? prev : items[0].id
          );
        }
        servicesLoaded = true;
        markReady();
      },
      (err) => {
        setLoadError(formatUserFacingError(err, 'Unable to load beauty services right now.'));
        setLoading(false);
      }
    );

    const unsubSpecialists = subscribeSpecialists(
      (items) => {
        setSpecialists(items);
        if (items.length > 0) {
          setSelectedSpecialistId((prev) =>
            items.some((s) => s.id === prev) ? prev : items[0].id
          );
        }
        specialistsLoaded = true;
        markReady();
      },
      (err) => {
        setLoadError(formatUserFacingError(err, 'Unable to load studio specialists right now.'));
        setLoading(false);
      }
    );

    return () => {
      unsubServices();
      unsubSpecialists();
    };
  }, []);

  useEffect(() => {
    const detach = attachCatalogListeners();
    return detach;
  }, [attachCatalogListeners]);

  async function handleSignIn(): Promise<void> {
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      if (credential.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        await ensureCatalogSeeded(credential.user.email).catch((err) => {
          console.error('Catalog sync warning:', err);
        });
      }
    } catch (error) {
      setAuthError(formatUserFacingError(error, 'Unable to sign in with Google right now.'));
    }
  }

  async function handleSignOut(): Promise<void> {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (error) {
      setAuthError(formatUserFacingError(error, 'Unable to sign out.'));
    }
  }

  function handleBookService(service: ServiceItem) {
    setDetailService(null);
    setSelectedServiceId(service.id);
    const matchingSpecialist = specialists.find((sp) => sp.specialty === service.category);
    if (matchingSpecialist) {
      setSelectedSpecialistId(matchingSpecialist.id);
    }
    navigateTo('booking');
  }

  function handleBookWithSpecialist(specialist: Specialist) {
    setSelectedSpecialistId(specialist.id);
    const matchingService = services.find((svc) => svc.category === specialist.specialty);
    if (matchingService) {
      setSelectedServiceId(matchingService.id);
    }
    navigateTo('booking');
  }

  function handleAppointmentCreated(_appointment: Appointment) {
    // Real-time Firestore listeners update slot availability and appointment lists automatically
  }

  function handleManageBooking(bookingRef: string) {
    setActiveLookupQuery(bookingRef);
    navigateTo('appointments');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F7] text-[#171412]">
      <Header currentPage={currentPage} onNavigate={navigateTo} />

      <main className="flex-1">
        {currentPage === 'home' && <HeroSection onNavigate={navigateTo} />}

        {currentPage === 'services' && (
          <ServicesGallery
            services={services}
            loading={loading}
            error={loadError}
            onRetry={attachCatalogListeners}
            onSelectServiceDetails={(service) => setDetailService(service)}
            onBookService={handleBookService}
          />
        )}

        {currentPage === 'specialists' && (
          <SpecialistsPage
            specialists={specialists}
            loading={loading}
            error={loadError}
            onRetry={attachCatalogListeners}
            onBookWithSpecialist={handleBookWithSpecialist}
          />
        )}

        {currentPage === 'booking' && (
          <BookingSection
            user={user}
            authReady={authReady}
            authError={authError}
            onSignIn={() => void handleSignIn()}
            onSignOut={() => void handleSignOut()}
            catalogSynced={catalogSynced}
            services={services}
            specialists={specialists}
            selectedServiceId={selectedServiceId}
            onChangeServiceId={setSelectedServiceId}
            selectedSpecialistId={selectedSpecialistId}
            onChangeSpecialistId={setSelectedSpecialistId}
            onAppointmentCreated={handleAppointmentCreated}
            onManageBooking={handleManageBooking}
          />
        )}

        {currentPage === 'appointments' && (
          <AppointmentsSection
            user={user}
            authReady={authReady}
            authError={authError}
            isAdmin={isAdmin}
            specialists={specialists}
            onSignIn={() => void handleSignIn()}
            onSignOut={() => void handleSignOut()}
            activeLookupQuery={activeLookupQuery}
          />
        )}
      </main>

      <Footer onNavigate={navigateTo} />

      <ServiceDetailModal
        service={detailService}
        onClose={() => setDetailService(null)}
        onBookService={handleBookService}
      />
    </div>
  );
}
