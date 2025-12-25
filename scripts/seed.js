const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function seed() {
  console.log('🌱 Starting seed...')

  try {
    // 1. Create organization
    console.log('Creating organization...')
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Example Manufacturing Co',
        slug: 'example-mfg'
      })
      .select()
      .single()

    if (orgError) throw orgError
    console.log('✓ Organization created')

    // 2. Create admin user
    console.log('Creating admin user...')
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@example.com',
      password: 'admin123456',
      email_confirm: true
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        organization_id: org.id,
        email: 'admin@example.com',
        full_name: 'Admin User',
        initials: 'AU',
        role: 'admin'
      })

    if (profileError) throw profileError
    console.log('✓ Admin user created (admin@example.com / admin123456)')

    // 3. Create scales
    console.log('Creating scales...')
    
    // Severity scale
    const { data: severityScale, error: sevError } = await supabase
      .from('scales')
      .insert({
        organization_id: org.id,
        name: 'Standard Severity Scale',
        type: 'severity'
      })
      .select()
      .single()

    if (sevError) throw sevError

    await supabase.from('scale_versions').insert({
      scale_id: severityScale.id,
      version: 1,
      effective_date: new Date().toISOString().split('T')[0],
      items: JSON.stringify([
        { value: 1, label: 'Negligible', definition: 'No effect on performance' },
        { value: 2, label: 'Very Minor', definition: 'Very minor effect on performance' },
        { value: 3, label: 'Minor', definition: 'Minor effect on performance' },
        { value: 4, label: 'Very Low', definition: 'Very low effect on performance' },
        { value: 5, label: 'Low', definition: 'Low effect on performance' },
        { value: 6, label: 'Moderate', definition: 'Moderate effect on performance' },
        { value: 7, label: 'High', definition: 'High effect on performance' },
        { value: 8, label: 'Very High', definition: 'Very high effect on performance' },
        { value: 9, label: 'Extreme', definition: 'Extreme effect with warning' },
        { value: 10, label: 'Hazardous', definition: 'Hazardous effect without warning' }
      ])
    })

    // Occurrence scale
    const { data: occurrenceScale, error: occError } = await supabase
      .from('scales')
      .insert({
        organization_id: org.id,
        name: 'Standard Occurrence Scale',
        type: 'occurrence'
      })
      .select()
      .single()

    if (occError) throw occError

    await supabase.from('scale_versions').insert({
      scale_id: occurrenceScale.id,
      version: 1,
      effective_date: new Date().toISOString().split('T')[0],
      items: JSON.stringify([
        { value: 1, label: 'Remote', definition: 'Failure unlikely (<1 in 1,000,000)' },
        { value: 2, label: 'Very Low', definition: '1 in 150,000' },
        { value: 3, label: 'Low', definition: '1 in 15,000' },
        { value: 4, label: 'Moderate Low', definition: '1 in 2,000' },
        { value: 5, label: 'Moderate', definition: '1 in 400' },
        { value: 6, label: 'Moderate High', definition: '1 in 80' },
        { value: 7, label: 'High', definition: '1 in 20' },
        { value: 8, label: 'Very High', definition: '1 in 8' },
        { value: 9, label: 'Extremely High', definition: '1 in 3' },
        { value: 10, label: 'Very Extremely High', definition: '>1 in 2' }
      ])
    })

    // Detection scale
    const { data: detectionScale, error: detError } = await supabase
      .from('scales')
      .insert({
        organization_id: org.id,
        name: 'Standard Detection Scale',
        type: 'detection'
      })
      .select()
      .single()

    if (detError) throw detError

    await supabase.from('scale_versions').insert({
      scale_id: detectionScale.id,
      version: 1,
      effective_date: new Date().toISOString().split('T')[0],
      items: JSON.stringify([
        { value: 1, label: 'Almost Certain', definition: 'Controls will almost certainly detect' },
        { value: 2, label: 'Very High', definition: 'Very high chance controls will detect' },
        { value: 3, label: 'High', definition: 'High chance controls will detect' },
        { value: 4, label: 'Moderately High', definition: 'Moderately high chance to detect' },
        { value: 5, label: 'Moderate', definition: 'Moderate chance to detect' },
        { value: 6, label: 'Low', definition: 'Low chance to detect' },
        { value: 7, label: 'Very Low', definition: 'Very low chance to detect' },
        { value: 8, label: 'Remote', definition: 'Remote chance to detect' },
        { value: 9, label: 'Very Remote', definition: 'Very remote chance to detect' },
        { value: 10, label: 'Absolute Uncertainty', definition: 'No detection opportunity' }
      ])
    })

    console.log('✓ Scales created')

    // 4. Create AP mapping
    console.log('Creating AP mapping...')
    const { error: apError } = await supabase
      .from('ap_mappings')
      .insert({
        organization_id: org.id,
        name: 'Standard AP Mapping',
        mapping_rules: JSON.stringify([
          { condition: { severity: [9, 10] }, ap: 'Critical' },
          { condition: { severity: [7, 8], occurrence: [7, 8, 9, 10] }, ap: 'High' },
          { condition: { severity: [7, 8], detection: [7, 8, 9, 10] }, ap: 'High' },
          { condition: { rpn: { min: 100 } }, ap: 'Medium' },
          { default: true, ap: 'Low' }
        ])
      })

    if (apError) throw apError
    console.log('✓ AP mapping created')

    // 5. Create people directory
    console.log('Creating people directory...')
    const people = [
      { name: 'John Smith', initials: 'JS', email: 'john.smith@example.com', role: 'Quality Engineer', site: 'Plant A' },
      { name: 'Jane Doe', initials: 'JD', email: 'jane.doe@example.com', role: 'Production Manager', site: 'Plant A' },
      { name: 'Mike Johnson', initials: 'MJ', email: 'mike.johnson@example.com', role: 'Maintenance Lead', site: 'Plant B' },
      { name: 'Sarah Williams', initials: 'SW', email: 'sarah.williams@example.com', role: 'Process Engineer', site: 'Plant B' }
    ]

    const { error: peopleError } = await supabase
      .from('people_directory')
      .insert(people.map(p => ({ ...p, organization_id: org.id })))

    if (peopleError) throw peopleError
    console.log('✓ People directory created')

    // 6. Create example analysis
    console.log('Creating example analysis...')
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        organization_id: org.id,
        title: 'Pump Failure Analysis - Unit 3',
        model: 'Centrifugal Pump CP-2000',
        application: 'Cooling Water System',
        part_name: 'Main Circulation Pump',
        analysis_date: new Date().toISOString().split('T')[0],
        abstract: 'Root cause analysis of repeated pump failures in Unit 3 cooling system',
        problem_statement: 'Pump has failed 3 times in the last 6 months causing production downtime',
        created_by: user.id
      })
      .select()
      .single()

    if (analysisError) throw analysisError
    console.log('✓ Analysis created')

    // 7. Create fault tree nodes
    console.log('Creating fault tree...')
    
    // Top event
    const { data: topNode, error: topError } = await supabase
      .from('nodes')
      .insert({
        analysis_id: analysis.id,
        type: 'top_event',
        label: 'Pump Failure',
        position: { x: 400, y: 50 }
      })
      .select()
      .single()

    if (topError) throw topError

    // Create branches
    const branches = [
      {
        why1: 'Mechanical Failure',
        why2: 'Bearing Failure',
        why3: 'Insufficient Lubrication',
        units: 'mL/day',
        spec: '100-150',
        s: 7, o: 6, d: 4
      },
      {
        why1: 'Mechanical Failure',
        why2: 'Seal Damage',
        why3: 'Excessive Pressure',
        units: 'PSI',
        spec: '<150',
        s: 6, o: 5, d: 3
      },
      {
        why1: 'Electrical Failure',
        why2: 'Motor Overheating',
        why3: 'Blocked Ventilation',
        units: '°C',
        spec: '<80',
        s: 5, o: 4, d: 2
      }
    ]

    for (const branch of branches) {
      // Create Why1 node
      let { data: why1Node } = await supabase
        .from('nodes')
        .select()
        .eq('analysis_id', analysis.id)
        .eq('label', branch.why1)
        .single()

      if (!why1Node) {
        const { data: newNode, error } = await supabase
          .from('nodes')
          .insert({
            analysis_id: analysis.id,
            type: 'intermediate_event',
            label: branch.why1,
            position: { x: 300, y: 150 }
          })
          .select()
          .single()
        
        if (error) throw error
        why1Node = newNode

        await supabase.from('node_edges').insert({
          analysis_id: analysis.id,
          source_id: topNode.id,
          target_id: why1Node.id
        })
      }

      // Create Why2 node
      const { data: why2Node, error: why2Error } = await supabase
        .from('nodes')
        .insert({
          analysis_id: analysis.id,
          type: 'intermediate_event',
          label: branch.why2,
          position: { x: 350, y: 250 }
        })
        .select()
        .single()

      if (why2Error) throw why2Error

      await supabase.from('node_edges').insert({
        analysis_id: analysis.id,
        source_id: why1Node.id,
        target_id: why2Node.id
      })

      // Create Why3 node (leaf)
      const { data: why3Node, error: why3Error } = await supabase
        .from('nodes')
        .insert({
          analysis_id: analysis.id,
          type: 'basic_event',
          label: branch.why3,
          units: branch.units,
          specification: branch.spec,
          position: { x: 400, y: 350 }
        })
        .select()
        .single()

      if (why3Error) throw why3Error

      await supabase.from('node_edges').insert({
        analysis_id: analysis.id,
        source_id: why2Node.id,
        target_id: why3Node.id
      })

      // Add risk score
      await supabase.from('risk_scores').insert({
        node_id: why3Node.id,
        severity: branch.s,
        occurrence: branch.o,
        detection: branch.d
      })

      // Add action item
      const { data: personResp } = await supabase
        .from('people_directory')
        .select()
        .eq('organization_id', org.id)
        .limit(1)
        .single()

      const { data: action, error: actionError } = await supabase
        .from('action_items')
        .insert({
          analysis_id: analysis.id,
          node_id: why3Node.id,
          investigation_item: `Investigate ${branch.why3}`,
          person_responsible_id: personResp.id,
          schedule: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single()

      if (actionError) throw actionError

      // Add week statuses
      for (let week = 1; week <= 4; week++) {
        await supabase.from('action_week_status').insert({
          action_item_id: action.id,
          week_number: week,
          status: week === 1 ? 'in_progress' : 'not_started'
        })
      }
    }

    console.log('✓ Fault tree created')
    console.log('\n✅ Seed completed successfully!')
    console.log('\nLogin credentials:')
    console.log('Email: admin@example.com')
    console.log('Password: admin123456')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()