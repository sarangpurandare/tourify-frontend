'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Group } from '@/types/group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Users } from 'lucide-react';

const GROUP_TYPES = ['family', 'friends', 'couple', 'corporate'] as const;
const COMM_PREFERENCES = ['primary_only', 'all'] as const;

function typePillColor(type: string) {
  switch (type) {
    case 'family': return 'purple';
    case 'friends': return 'blue';
    case 'couple': return 'pink';
    case 'corporate': return 'teal';
    default: return '';
  }
}

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    type: 'family' as string,
    is_permanent: false,
    comm_preference: 'primary_only' as string,
    member_ids: [] as string[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['groups', search],
    queryFn: () =>
      api.get<APIResponse<Group[]>>(`/groups?search=${encodeURIComponent(search)}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newGroup) =>
      api.post<APIResponse<Group>>('/groups', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setDialogOpen(false);
      setNewGroup({
        name: '',
        type: 'family',
        is_permanent: false,
        comm_preference: 'primary_only',
        member_ids: [],
      });
    },
  });

  const groups = data?.data ?? [];

  function handleCreate() {
    if (!newGroup.name.trim()) return;
    createMutation.mutate(newGroup);
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="crm-title-1">Groups</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <button className="crm-btn primary">
                <Plus size={14} />
                Create Group
              </button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
              <DialogDescription>Add a new group to organize travellers.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Group name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={newGroup.type}
                  onValueChange={(val) => val !== null && setNewGroup((prev) => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Communication Preference</Label>
                <Select
                  value={newGroup.comm_preference}
                  onValueChange={(val) => val !== null && setNewGroup((prev) => ({ ...prev, comm_preference: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMM_PREFERENCES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === 'primary_only' ? 'Primary Only' : 'All'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="is-permanent"
                  type="checkbox"
                  checked={newGroup.is_permanent}
                  onChange={(e) => setNewGroup((prev) => ({ ...prev, is_permanent: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <Label htmlFor="is-permanent">Permanent group</Label>
              </div>
            </div>
            <DialogFooter>
              <button
                className="crm-btn primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newGroup.name.trim()}
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="crm-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={14} style={{ color: 'var(--crm-text-3)' }} />
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--crm-text)',
              width: '100%',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Loading...</span>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
            <div className="crm-caption">No groups found</div>
          </div>
        ) : (
          <>
            <div className="crm-row hd" style={{ gridTemplateColumns: '2fr 1fr 80px 1fr 1fr' }}>
              <span>Name</span>
              <span>Type</span>
              <span>Members</span>
              <span>Permanent</span>
              <span>Communication</span>
            </div>
            {groups.map((group) => (
              <div
                key={group.id}
                className="crm-row"
                style={{ gridTemplateColumns: '2fr 1fr 80px 1fr 1fr', cursor: 'default' }}
                onClick={() => router.push(`/groups/${group.id}`)}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{group.name}</span>
                <span>
                  <span className={`crm-pill ${typePillColor(group.type)}`}>
                    {group.type}
                  </span>
                </span>
                <span className="crm-tabular" style={{ fontSize: 13 }}>
                  {group.members?.length ?? 0}
                </span>
                <span style={{ fontSize: 13 }}>
                  {group.is_permanent ? (
                    <span className="crm-pill green">Yes</span>
                  ) : (
                    <span className="crm-dim" style={{ fontSize: 13 }}>No</span>
                  )}
                </span>
                <span style={{ fontSize: 13 }}>
                  {group.comm_preference === 'primary_only' ? 'Primary Only' : 'All'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
