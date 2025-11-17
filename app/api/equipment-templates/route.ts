import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const templatesCollection = db.collection('equipmentTemplates');

    const templates = await templatesCollection
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Convert _id to string for JSON serialization
    const templatesWithStringIds = templates.map((template) => ({
      ...template,
      _id: template._id.toString(),
    }));

    return NextResponse.json({ templates: templatesWithStringIds }, { status: 200 });
  } catch (error) {
    console.error('Error fetching equipment templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, model } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Equipment name is required' },
        { status: 400 }
      );
    }

    if (!model || model.trim() === '') {
      return NextResponse.json(
        { error: 'Equipment model is required' },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('tixmgmt');
    const templatesCollection = db.collection('equipmentTemplates');

    // Check if template already exists (same name and model)
    const existing = await templatesCollection.findOne({
      name: name.trim(),
      model: model.trim(),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Equipment template with this name and model already exists' },
        { status: 400 }
      );
    }

    const template = {
      name: name.trim(),
      model: model.trim(),
      createdAt: new Date(),
    };

    const result = await templatesCollection.insertOne(template);

    return NextResponse.json(
      { success: true, template: { ...template, _id: result.insertedId.toString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating equipment template:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment template' },
      { status: 500 }
    );
  }
}

