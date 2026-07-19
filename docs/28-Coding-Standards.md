# Coding Standards — Jamming Events Platform

## 1. Language & Framework

| Standard | Choice |
|----------|--------|
| Language | TypeScript (strict mode) |
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Package Manager | npm |
| Node Version | 18.x LTS or 20.x LTS |

---

## 2. TypeScript Configuration

```json
// tsconfig.json (strict)
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Strict Rules

```json
{
  "noUncheckedIndexedAccess": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": false
}
```

---

## 3. Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files (components) | PascalCase | `EventCard.tsx` |
| Files (utilities) | kebab-case | `format-date.ts` |
| Files (API routes) | kebab-case | `route.ts` |
| Components | PascalCase | `ScannerView` |
| Functions | camelCase | `generateTicket` |
| Variables | camelCase | `ticketCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_CAPACITY` |
| Types/Interfaces | PascalCase | `TicketStatus` |
| Enums | PascalCase | `TicketType` |
| Private fields | `_` prefix | `_cache` (rare, avoid) |
| Boolean variables | `is`/`has`/`can` prefix | `isValid`, `hasTickets` |
| Event handlers | `handle` prefix | `handleScan` |

---

## 4. File Organization

### Component File Structure

```typescript
// 1. Imports (grouped)
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

// 2. Types
interface EventCardProps {
  event: EventData;
  variant?: 'grid' | 'list';
}

// 3. Component
export function EventCard({ event, variant = 'grid' }: EventCardProps) {
  // hooks
  const { data: session } = useSession();
  
  // state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // handlers
  const handleClick = () => { };
  
  // return JSX
  return (
    <div className="...">
      {/* content */}
    </div>
  );
}
```

### API Route File Structure

```typescript
// 1. Imports
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// 2. Validation schema
const createEventSchema = z.object({
  title: z.string().min(5),
  // ...
});

// 3. Route handler
export async function POST(req: NextRequest) {
  // auth check
  // validation
  // business logic
  // response
}
```

---

## 5. Component Standards

### Functional Components Only

```typescript
// ✅ Preferred
export function EventCard(props: EventCardProps) {
  return <div>...</div>;
}

// ❌ Avoid class components
// ❌ Avoid React.FC (implicit children)
```

### Props Interface

```typescript
// ✅ Descriptive and explicit
interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  size: 'sm' | 'md' | 'lg';
  className?: string; // Allow overrides
}

// ❌ Avoid prop spreading without control
```

### State Management

```typescript
// Server State: TanStack Query (React Query)
const { data, isLoading, error } = useQuery({
  queryKey: ['events', filters],
  queryFn: () => fetchEvents(filters),
});

// Client State: Zustand (for global state)
const useScannerStore = create<ScannerState>((set) => ({
  scans: [],
  addScan: (scan) => set((state) => ({ scans: [...state.scans, scan] })),
}));

// Local State: useState / useReducer
const [formData, setFormData] = useState<EventFormData>(initialState);
```

---

## 6. Styling Standards

### Tailwind Usage

```tsx
// ✅ Use Tailwind utility classes
<div className="flex items-center gap-4 rounded-lg bg-surface p-6 shadow-md">
  <span className="text-sm font-medium text-text-secondary">Info</span>
</div>

// ✅ Use clsx for conditional classes
<div className={clsx(
  'rounded-lg p-4',
  isValid ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
)}>

// ❌ Avoid inline styles (except dynamic values)
// ❌ Avoid CSS-in-JS libraries (emotion, styled-components)
```

### Custom Design Tokens

```tailwindcss
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#EDE9FE',
          dark: '#5B21B6',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          hover: '#242424',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          muted: '#52525B',
        },
      },
    },
  },
};
```

---

## 7. Error Handling Patterns

### API Route Error Handling

```typescript
export async function handler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorized('Authentication required');
    }
    
    const body = await req.json();
    const validated = createEventSchema.parse(body);
    
    const event = await eventService.createEvent(validated, session.user.id);
    
    return success(event, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return conflict('Resource already exists');
    }
    return internalError('An unexpected error occurred');
  }
}
```

### Client-Side Error Handling

```typescript
// Custom hooks for consistent error handling
export function useApi<T>(url: string) {
  const query = useQuery<T>({
    queryKey: [url],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        throw new ApiError(error.error.code, error.error.message);
      }
      return res.json();
    },
  });
  
  return query;
}
```

---

## 8. Testing Standards

### Unit Test Example

```typescript
describe('TicketService', () => {
  describe('generateTicketNumber', () => {
    it('should generate unique ticket numbers', () => {
      const numbers = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        numbers.add(generateTicketNumber());
      }
      expect(numbers.size).toBe(1000);
    });
    
    it('should follow JAM-YYYY-XXXXX format', () => {
      const number = generateTicketNumber();
      expect(number).toMatch(/^JAM-\d{4}-\d{5}$/);
    });
  });
});
```

---

## 9. Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `test` | Adding or fixing tests |
| `chore` | Build process, tooling, dependencies |

### Examples

```
feat(events): add event creation form with validation
fix(tickets): prevent double RSVP race condition
docs(api): add check-in endpoint documentation
refactor(scanner): extract verification logic into service
test(tickets): add unit tests for ticket number generation
```

---

## 10. Code Review Standards

### Checklist

- [ ] Code compiles without errors
- [ ] TypeScript types are correct (no `any` unless justified)
- [ ] Tests pass and coverage is sufficient
- [ ] No console.log statements (use proper logger)
- [ ] Error cases are handled
- [ ] Accessibility basics covered (alt text, labels, keyboard nav)
- [ ] No hardcoded values (use constants/env vars)
- [ ] Feature works in dark mode
- [ ] Feature works on mobile viewport
- [ ] No security vulnerabilities introduced

---

## 11. Documentation Standards

- All exports must have JSDoc comments for public APIs
- Complex logic must have inline comments
- README kept up to date with setup instructions
- API changes must update the API specification
- Component props should be self-documenting via TypeScript
