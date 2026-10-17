import { usePage } from '@inertiajs/react';

export type RoomTypeOption = {
    id: string;
    code: string;
    name: string;
    active: boolean;
};

export function useRoomTypeCatalog(): RoomTypeOption[] {
    return (
        usePage<{ roomTypeCatalog: RoomTypeOption[] }>().props
            .roomTypeCatalog ?? []
    );
}

export function roomTypeName(catalog: RoomTypeOption[], code: string): string {
    return (
        catalog.find((type) => type.code === code)?.name ??
        code.replaceAll('_', ' ')
    );
}
