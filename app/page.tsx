import Link from 'next/link';
import { ObrasTable } from '@/components/obras-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import { Music, Palette } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Works Registry</h1>
              <p className="text-muted-foreground text-sm">
                CWR Management System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/design-system">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Design system"
                className="text-muted-foreground hover:text-foreground"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <ObrasTable />
      </div>
    </main>
  );
}
