IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719165742_InitialPersistence'
)
BEGIN
    CREATE TABLE [Children] (
        [Id] nvarchar(100) NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_Children] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719165742_InitialPersistence'
)
BEGIN
    CREATE TABLE [Stories] (
        [Id] nvarchar(100) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Theme] nvarchar(100) NOT NULL,
        [Summary] nvarchar(500) NOT NULL,
        [ReadingMinutes] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_Stories] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719165742_InitialPersistence'
)
BEGIN
    CREATE TABLE [StoryParagraphs] (
        [Id] nvarchar(150) NOT NULL,
        [StoryId] nvarchar(100) NOT NULL,
        [Sequence] int NOT NULL,
        [Text] nvarchar(2000) NOT NULL,
        CONSTRAINT [PK_StoryParagraphs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StoryParagraphs_Stories_StoryId] FOREIGN KEY ([StoryId]) REFERENCES [Stories] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719165742_InitialPersistence'
)
BEGIN
    CREATE UNIQUE INDEX [IX_StoryParagraphs_StoryId_Sequence] ON [StoryParagraphs] ([StoryId], [Sequence]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719165742_InitialPersistence'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260719165742_InitialPersistence', N'10.0.8');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    CREATE TABLE [ReadingSessions] (
        [Id] int NOT NULL IDENTITY,
        [StoryId] nvarchar(100) NOT NULL,
        [StoryTitleSnapshot] nvarchar(200) NOT NULL,
        [StartedAtUtc] datetimeoffset NOT NULL,
        [CompletedAtUtc] datetimeoffset NOT NULL,
        [ElapsedSeconds] int NOT NULL,
        [BeforeNotes] nvarchar(2000) NULL,
        [AfterNotes] nvarchar(2000) NULL,
        CONSTRAINT [PK_ReadingSessions] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ReadingSessions_CompletedAfterStarted] CHECK ([CompletedAtUtc] >= [StartedAtUtc]),
        CONSTRAINT [CK_ReadingSessions_ElapsedSeconds] CHECK ([ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400),
        CONSTRAINT [FK_ReadingSessions_Stories_StoryId] FOREIGN KEY ([StoryId]) REFERENCES [Stories] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    CREATE TABLE [ReadingSessionChildObservations] (
        [Id] int NOT NULL IDENTITY,
        [ReadingSessionId] int NOT NULL,
        [ChildId] nvarchar(100) NOT NULL,
        [ChildNameSnapshot] nvarchar(100) NOT NULL,
        [BeforeCalmness] int NOT NULL,
        [AfterCalmness] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_ReadingSessionChildObservations] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ReadingSessionChildObservations_AfterCalmness] CHECK ([AfterCalmness] >= 1 AND [AfterCalmness] <= 5),
        CONSTRAINT [CK_ReadingSessionChildObservations_BeforeCalmness] CHECK ([BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5),
        CONSTRAINT [FK_ReadingSessionChildObservations_Children_ChildId] FOREIGN KEY ([ChildId]) REFERENCES [Children] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ReadingSessionChildObservations_ReadingSessions_ReadingSessionId] FOREIGN KEY ([ReadingSessionId]) REFERENCES [ReadingSessions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    CREATE INDEX [IX_ReadingSessionChildObservations_ChildId] ON [ReadingSessionChildObservations] ([ChildId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReadingSessionChildObservations_ReadingSessionId_ChildId] ON [ReadingSessionChildObservations] ([ReadingSessionId], [ChildId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    CREATE INDEX [IX_ReadingSessions_StoryId] ON [ReadingSessions] ([StoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260719202526_AddReadingSessions'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260719202526_AddReadingSessions', N'10.0.8');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    IF EXISTS (SELECT 1 FROM [dbo].[Children])
        OR EXISTS (SELECT 1 FROM [dbo].[Stories])
        OR EXISTS (SELECT 1 FROM [dbo].[StoryParagraphs])
        OR EXISTS (SELECT 1 FROM [dbo].[ReadingSessions])
        OR EXISTS (SELECT 1 FROM [dbo].[ReadingSessionChildObservations])
    THROW 51000, 'AlignSqlServerSchemaStandards requires an empty development database. Back up and reset BedtimeStoryTrackerDemo before applying it.', 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    DROP TABLE [ReadingSessionChildObservations];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    DROP TABLE [ReadingSessions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    DROP TABLE [StoryParagraphs];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    DROP TABLE [Children];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    DROP TABLE [Stories];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    IF SCHEMA_ID(N'BedtimeTracking') IS NULL EXEC(N'CREATE SCHEMA [BedtimeTracking];');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE TABLE [BedtimeTracking].[Child] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_Child_Id] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE TABLE [BedtimeTracking].[Story] (
        [Id] int NOT NULL IDENTITY,
        [Title] nvarchar(200) NOT NULL,
        [Theme] nvarchar(100) NOT NULL,
        [Summary] nvarchar(500) NOT NULL,
        [ReadingMinutes] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_Story_Id] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE TABLE [BedtimeTracking].[StoryParagraph] (
        [Id] int NOT NULL IDENTITY,
        [StoryId] int NOT NULL,
        [Sequence] int NOT NULL,
        [Text] nvarchar(2000) NOT NULL,
        CONSTRAINT [PK_StoryParagraph_Id] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_StoryParagraph_Story] FOREIGN KEY ([StoryId]) REFERENCES [BedtimeTracking].[Story] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE TABLE [BedtimeTracking].[ReadingSession] (
        [Id] int NOT NULL IDENTITY,
        [StoryId] int NOT NULL,
        [StoryTitleSnapshot] nvarchar(200) NOT NULL,
        [StartedAtUtc] datetime2 NOT NULL,
        [CompletedAtUtc] datetime2 NOT NULL,
        [ElapsedSeconds] int NOT NULL,
        [BeforeNotes] nvarchar(2000) NULL,
        [AfterNotes] nvarchar(2000) NULL,
        CONSTRAINT [PK_ReadingSession_Id] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ReadingSession_CompletedAtUtc] CHECK ([CompletedAtUtc] >= [StartedAtUtc]),
        CONSTRAINT [CK_ReadingSession_ElapsedSeconds] CHECK ([ElapsedSeconds] > 0 AND [ElapsedSeconds] <= 86400),
        CONSTRAINT [FK_ReadingSession_Story] FOREIGN KEY ([StoryId]) REFERENCES [BedtimeTracking].[Story] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE TABLE [BedtimeTracking].[ReadingSessionChildObservation] (
        [Id] int NOT NULL IDENTITY,
        [ReadingSessionId] int NOT NULL,
        [ChildId] int NOT NULL,
        [ChildNameSnapshot] nvarchar(100) NOT NULL,
        [BeforeCalmness] int NOT NULL,
        [AfterCalmness] int NOT NULL,
        [DisplayOrder] int NOT NULL,
        CONSTRAINT [PK_ReadingSessionChildObservation_Id] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_ReadingSessionChildObservation_AfterCalmness] CHECK ([AfterCalmness] >= 1 AND [AfterCalmness] <= 5),
        CONSTRAINT [CK_ReadingSessionChildObservation_BeforeCalmness] CHECK ([BeforeCalmness] >= 1 AND [BeforeCalmness] <= 5),
        CONSTRAINT [FK_ReadingSessionChildObservation_Child] FOREIGN KEY ([ChildId]) REFERENCES [BedtimeTracking].[Child] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ReadingSessionChildObservation_ReadingSession] FOREIGN KEY ([ReadingSessionId]) REFERENCES [BedtimeTracking].[ReadingSession] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE UNIQUE INDEX [UQ_StoryParagraph_StoryId_Sequence] ON [BedtimeTracking].[StoryParagraph] ([StoryId], [Sequence]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE INDEX [IX_ReadingSession_StoryId] ON [BedtimeTracking].[ReadingSession] ([StoryId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE INDEX [IX_ReadingSessionChildObservation_ChildId] ON [BedtimeTracking].[ReadingSessionChildObservation] ([ChildId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    CREATE UNIQUE INDEX [UQ_ReadingSessionChildObservation_ReadingSessionId_ChildId] ON [BedtimeTracking].[ReadingSessionChildObservation] ([ReadingSessionId], [ChildId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720084819_AlignSqlServerSchemaStandards'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260720084819_AlignSqlServerSchemaStandards', N'10.0.8');
END;

COMMIT;
GO

