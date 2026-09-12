# FleetEase — Fleet Management Database System

> A database-driven fleet management system designed to efficiently manage vehicles, drivers, trips, maintenance, and fleet-related operations.

## 📌 Overview

**FleetEase** is a Database Management System (DBMS) project developed to provide a centralized platform for managing and organizing fleet-related information.

The system focuses on maintaining structured records for vehicles, drivers, trips, maintenance activities, and other operational data while demonstrating core database concepts such as relational data modeling, normalization, SQL queries, constraints, and transaction management.

---

## 🎯 Objectives

The main objectives of FleetEase are to:

- Centralize fleet-related information in a structured database.
- Maintain vehicle and driver records efficiently.
- Manage trip and operational information.
- Track vehicle maintenance and service history.
- Reduce redundant data through proper database design.
- Provide efficient querying and retrieval of fleet information.
- Demonstrate practical implementation of DBMS concepts.

---

## 🚛 Key Features

### Vehicle Management
- Add and manage vehicle records.
- Maintain vehicle specifications and registration information.
- Track vehicle status and availability.

### Driver Management
- Maintain driver profiles.
- Store relevant driver information.
- Associate drivers with fleet operations.

### Trip Management
- Record trip-related information.
- Associate vehicles and drivers with trips.
- Track trip status and operational details.

### Maintenance Management
- Maintain vehicle service records.
- Track maintenance activities.
- Store maintenance history for individual vehicles.

### Database Operations
- CRUD operations for major entities.
- Relational data management.
- SQL-based querying and filtering.
- Primary and foreign key constraints.
- Data integrity enforcement.

---

## 🗃️ Database Design

FleetEase follows a relational database architecture.

### Core Entities

The database consists of entities such as:

- `Vehicle`
- `Driver`
- `Trip`
- `Maintenance`
- `[ADD OTHER TABLES FROM YOUR PROJECT]`

### Entity Relationship Diagram

```mermaid
erDiagram

    DRIVER ||--o{ TRIP : assigned
    VEHICLE ||--o{ TRIP : used
    VEHICLE ||--o{ MAINTENANCE : undergoes

    DRIVER {
        int driver_id PK
        string name
        string contact
        string license_no
    }

    VEHICLE {
        int vehicle_id PK
        string registration_no
        string vehicle_type
        string status
    }

    TRIP {
        int trip_id PK
        int driver_id FK
        int vehicle_id FK
        date trip_date
        string status
    }

    MAINTENANCE {
        int maintenance_id PK
        int vehicle_id FK
        date service_date
        string service_type
        decimal cost
    }
