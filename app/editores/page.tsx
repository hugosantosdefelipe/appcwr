import Link from 'next/link';
import { EditoresTable } from '@/components/editores-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft } from 'lucide-react';

export default function EditoresPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Editores SGAE</h1>
              <p className="text-muted-foreground text-sm">
                Editores que controlamos y estado de su nº de catálogo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Works Registry
              </Button>
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <EditoresTable />
      </div>
    </main>
  );
}
