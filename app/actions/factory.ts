'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assignFactory(itemId: string, factoryId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('order_items')
        .update({ factory_id: factoryId, status: 'assigned' })
        .eq('id', itemId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin')
    revalidatePath(`/admin/orders`)
}

export async function updateItemStatus(itemId: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', itemId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin')
    revalidatePath('/factory')
}

export async function createFactory(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string
    const country = formData.get('country') as string
    const contact_email = formData.get('contact_email') as string

    const { error } = await supabase
        .from('factories')
        .insert({ name, country, contact_email })

    if (error) throw new Error(error.message)
    revalidatePath('/admin/factories')
}

export async function updateOrderStatus(orderId: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin')
}

// Assign a Supabase Auth user to a factory (factory role)
export async function linkUserToFactory(userId: string, factoryId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ factory_id: factoryId, role: 'factory' })
        .eq('id', userId)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/factories')
}
