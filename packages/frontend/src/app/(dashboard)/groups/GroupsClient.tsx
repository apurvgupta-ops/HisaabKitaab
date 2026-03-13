'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Plane,
  Home,
  Heart,
  Briefcase,
  MoreHorizontal,
  DollarSign,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useGetGroupsQuery } from '@/store/api/groupApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { formatCurrency } from '@splitwise/shared';
import type { Group, GroupType } from '@splitwise/shared';

const GROUP_TYPE_CONFIG: Record<GroupType, { label: string; icon: LucideIcon; color: string }> = {
  trip: { label: 'Trip', icon: Plane, color: 'bg-blue-100 text-blue-700' },
  home: { label: 'Home', icon: Home, color: 'bg-emerald-100 text-emerald-700' },
  couple: { label: 'Couple', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  project: { label: 'Project', icon: Briefcase, color: 'bg-amber-100 text-amber-700' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' },
};

function GroupCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-muted h-5 w-32 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
          </div>
          <div className="bg-muted h-10 w-10 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="bg-muted h-4 w-20 rounded" />
            <div className="bg-muted h-4 w-12 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
        <Users className="text-primary h-10 w-10" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">No groups yet</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Create a group to start splitting expenses with friends, family, or roommates.
      </p>
      <Button className="mt-6 gap-2" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create Your First Group
      </Button>
    </div>
  );
}

export default function GroupsPage() {
  const { data, isLoading } = useGetGroupsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const groups = (Array.isArray(data) ? data : []) as Group[];

  const filteredGroups = groups.filter((group: Group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || group.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your expense sharing groups</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {(groups.length > 0 || isLoading) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="trip">Trip</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="couple">Couple</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <GroupCardSkeleton key={i} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateOpen(true)} />
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="text-muted-foreground h-10 w-10" />
          <p className="mt-4 text-sm font-medium">No matching groups</p>
          <p className="text-muted-foreground mt-1 text-xs">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group: Group) => {
            const config = GROUP_TYPE_CONFIG[group.type] ?? GROUP_TYPE_CONFIG.other;
            const TypeIcon = config.icon;

            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="group cursor-pointer hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-lg">{group.name}</CardTitle>
                        <Badge variant="secondary" className={`mt-1.5 ${config.color}`}>
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="bg-primary/10 group-hover:bg-primary/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                        <Users className="text-primary h-5 w-5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          Currency
                        </span>
                        <span className="text-foreground font-medium">{group.currency}</span>
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between">
                        <span>Balance</span>
                        <span className="text-foreground font-semibold">
                          {formatCurrency(0, group.currency)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
