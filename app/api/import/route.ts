import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ImportedRow } from '@/lib/import/xlsx-import'

interface ImportRequest {
  organizationId: string
  analysisName: string
  rows: ImportedRow[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ImportRequest = await request.json()
    const { organizationId, analysisName, rows } = body

    if (!organizationId || !rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user belongs to organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single<{ organization_id: string }>()

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create the analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        title: analysisName || 'Imported Analysis',
        organization_id: organizationId,
        created_by: user.id,
        status: 'draft',
        analysis_date: new Date().toISOString().split('T')[0],
      } as any)
      .select('id')
      .single<{ id: string }>()

    if (analysisError || !analysis) {
      console.error('Failed to create analysis:', analysisError)
      return NextResponse.json(
        { error: 'Failed to create analysis' },
        { status: 500 }
      )
    }

    // Get people directory for mapping names to IDs
    const { data: people } = await supabase
      .from('people_directory')
      .select('id, name, email')
      .eq('organization_id', organizationId) as { data: Array<{ id: string; name: string | null; email: string }> | null }

    const peopleMap = new Map(
      (people || []).map((p) => [p.name?.toLowerCase(), p.id])
    )

    // Import each row
    let importedCount = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        // Build the why chain array
        const whyChain = [
          row.why_1,
          row.why_2,
          row.why_3,
          row.why_4,
          row.why_5,
          row.why_6,
          row.why_7,
          row.why_8,
          row.why_9,
        ].filter((w): w is string => Boolean(w))

        // Look up person responsible
        let personResponsibleId: string | null = null
        if (row.person_responsible_name) {
          personResponsibleId =
            peopleMap.get(row.person_responsible_name.toLowerCase()) || null
        }

        // Call the RPC function to create nodes from table row
        const { data: nodeIds, error: rpcError } = await (supabase as any).rpc(
          'create_nodes_from_table_row',
          {
            p_analysis_id: analysis.id,
            p_failure_mode_top: row.failure_mode_top,
            p_why_chain: whyChain,
            p_units: row.units || null,
            p_specification: row.specification || null,
          }
        ) as { data: string[] | null; error: any }

        if (rpcError) {
          errors.push(`Row "${row.failure_mode_top}": ${rpcError.message}`)
          continue
        }

        // Get the leaf node (last in the chain)
        const leafNodeId = Array.isArray(nodeIds) ? nodeIds[nodeIds.length - 1] : nodeIds

        if (leafNodeId) {
          // Create risk score if S/O/D values exist
          if (row.severity || row.occurrence || row.detection) {
            await (supabase as any).from('risk_scores').insert({
              node_id: leafNodeId,
              severity: row.severity || 1,
              occurrence: row.occurrence || 1,
              detection: row.detection || 1,
            })
          }

          // Create action item if investigation_item exists
          if (row.investigation_item) {
            await (supabase as any)
              .from('action_items')
              .insert({
                organization_id: organizationId,
                analysis_id: analysis.id,
                node_id: leafNodeId,
                title: row.investigation_item,
                investigation_item: row.investigation_item,
                action_type: row.action_type || 'INVESTIGATION',
                status: row.status || 'NOT_STARTED',
                priority: row.priority || null,
                person_responsible_id: personResponsibleId,
                due_date: row.due_date || row.schedule || null,
                close_criteria: row.close_criteria || null,
                result: row.investigation_result || null,
                investigation_result: row.investigation_result || null,
                judgment: row.judgment || null,
                remarks: row.remarks || null,
                evidence_status: 'NONE',
                created_by: user.id,
              })
          }
        }

        importedCount++
      } catch (err) {
        errors.push(
          `Row "${row.failure_mode_top}": ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      analysisId: analysis.id,
      importedCount,
      totalRows: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    )
  }
}
