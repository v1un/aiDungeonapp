
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function LorebookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-4xl mb-8 flex items-center">
        <Link href="/" passHref>
          <Button variant="outline" size="icon" className="mr-4">
            <ArrowLeft size={20} />
            <span className="sr-only">Back to Chat</span>
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Lorebook</h1>
      </header>
      <main className="w-full max-w-4xl">
        {children}
      </main>
    </div>
  );
}
