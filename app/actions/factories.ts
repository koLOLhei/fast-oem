'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireRole } from '@/lib/auth/guard'

// 権限チェックヘルパー
async function requireAdminRole() {
  await requireRole(['admin', 'super_admin'])
}

// 工場作成
export async function createFactory(formData: FormData) {
  await requireAdminRole()
  
  const name = formData.get('name') as string
  const country = formData.get('country') as string
  const email = formData.get('email') as string
  const contactName = formData.get('contact_name') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const maxCapacity = formData.get('max_capacity')

  if (!name || !country) {
    throw new Error('工場名と国は必須です')
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('factories')
    .insert({
      name,
      country,
      email: email || null,
      contact_name: contactName || null,
      phone: phone || null,
      address: address || null,
      max_capacity: maxCapacity ? parseInt(maxCapacity as string) : null,
      is_active: true,
    })

  if (error) {
    console.error('Factory create error:', error)
    throw new Error('工場の登録に失敗しました: ' + error.message)
  }

  revalidatePath('/admin/factories')
}

// 工場更新
export async function updateFactory(factoryId: string, formData: FormData) {
  await requireAdminRole()

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('factories')
    .update({
      name: formData.get('name') as string,
      country: formData.get('country') as string,
      email: (formData.get('email') as string) || null,
      contact_name: (formData.get('contact_name') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
      max_capacity: formData.get('max_capacity')
        ? parseInt(formData.get('max_capacity') as string)
        : null,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', factoryId)

  if (error) {
    console.error('Factory update error:', error)
    throw new Error('工場の更新に失敗しました: ' + error.message)
  }

  revalidatePath('/admin/factories')
}

// 工場削除
export async function deleteFactory(factoryId: string) {
  await requireAdminRole()

  const supabase = createServiceClient()

  // 注文・ユーザーが紐づいている場合は削除不可
  const [{ count: orderCount }, { count: userCount }] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('factory_id', factoryId),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('factory_id', factoryId),
  ])

  if ((orderCount ?? 0) > 0) {
    throw new Error('この工場には注文が存在するため削除できません')
  }

  if ((userCount ?? 0) > 0) {
    throw new Error('この工場には担当ユーザーが存在するため削除できません')
  }

  const { error } = await supabase
    .from('factories')
    .delete()
    .eq('id', factoryId)

  if (error) {
    console.error('Factory delete error:', error)
    throw new Error('工場の削除に失敗しました: ' + error.message)
  }

  revalidatePath('/admin/factories')
}