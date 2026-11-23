export type AppPage = 'home' | 'services' | 'specialists' | 'booking' | 'appointments';

export function parsePageFromPath(pathname: string): AppPage {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';

  switch (normalized) {
    case '/services':
    case '/gallery':
      return 'services';
    case '/specialists':
      return 'specialists';
    case '/booking':
      return 'booking';
    case '/appointments':
      return 'appointments';
    case '/':
    default:
      return 'home';
  }
}

export function pathForPage(page: AppPage): string {
  switch (page) {
    case 'services':
      return '/services';
    case 'specialists':
      return '/specialists';
    case 'booking':
      return '/booking';
    case 'appointments':
      return '/appointments';
    case 'home':
    default:
      return '/';
  }
}
