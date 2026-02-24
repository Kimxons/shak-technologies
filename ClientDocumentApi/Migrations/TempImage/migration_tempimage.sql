-- Create t_ImageTemp table for temporary image management
-- Database: Kairo_Files
-- Created: 2026-01-28

-- Create the main table
CREATE TABLE [dbo].[t_ImageTemp] (
    [TempImageID] BIGINT NOT NULL IDENTITY(1,1),
    [ModuleID] SMALLINT NULL,
    [ImageID] BIGINT NULL,
    [ImageTypeID] VARCHAR(50) NOT NULL,
    [OurBranchID] VARCHAR(12) NULL,
    [ClientID] VARCHAR(40) NULL,
    [AccountID] VARCHAR(40) NULL,
    [TempClientID] VARCHAR(40) NULL,
    [Image] VARBINARY(MAX) NULL,
    [ThumbNailImage] VARBINARY(MAX) NULL,
    [Description] VARCHAR(255) NULL,
    [CopyToClientImage] BIT NULL,
    [CreatedBy] VARCHAR(25) NULL,
    [CreatedOn] DATETIME2 NULL,
    [sImage] VARCHAR(MAX) NOT NULL,
    [ModifiedBy] VARCHAR(25) NULL,
    [ModifiedOn] DATETIME2 NULL,
    [DeletedBy] VARCHAR(25) NULL,
    [DeletedOn] DATETIME2 NULL,
    [UpdateCount] TINYINT NULL,
    CONSTRAINT [PK_t_ImageTemp] PRIMARY KEY CLUSTERED ([TempImageID])
);

-- Create indexes for performance
CREATE INDEX [IX_t_ImageTemp_ClientID] ON [dbo].[t_ImageTemp] ([ClientID]);
CREATE INDEX [IX_t_ImageTemp_TempClientID] ON [dbo].[t_ImageTemp] ([TempClientID]);

-- Record the migration in __EFMigrationsHistory
INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES ('20260128_AddTempImageTable', '8.0.0');

PRINT 'Migration 20260128_AddTempImageTable applied successfully.';
