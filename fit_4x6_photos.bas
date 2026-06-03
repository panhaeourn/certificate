Attribute VB_Name = "FitCertificatePhotos"
Option Explicit

Private Const PHOTO_COLUMN As Long = 11
Private Const PHOTO_WIDTH_CM As Double = 4
Private Const PHOTO_HEIGHT_CM As Double = 6

Public Sub FitAllCertificatePhotos4x6()
    Dim ws As Worksheet
    Dim shapeItem As Shape
    Dim targetRow As Long

    Set ws = ActiveSheet
    PreparePhotoColumn ws

    For Each shapeItem In ws.Shapes
        If IsPicture(shapeItem) Then
            targetRow = shapeItem.TopLeftCell.Row
            If targetRow >= 2 Then
                FitShapeToRow ws, shapeItem, targetRow
            End If
        End If
    Next shapeItem
End Sub

Public Sub FitSelectedPhoto4x6()
    Dim ws As Worksheet
    Dim shapeItem As Shape
    Dim targetRow As Long

    Set ws = ActiveSheet
    PreparePhotoColumn ws

    If TypeName(Selection) <> "DrawingObjects" And TypeName(Selection) <> "Picture" Then
        MsgBox "Select one or more pictures first.", vbInformation
        Exit Sub
    End If

    For Each shapeItem In Selection.ShapeRange
        If IsPicture(shapeItem) Then
            targetRow = shapeItem.TopLeftCell.Row
            If targetRow < 2 Then targetRow = ActiveCell.Row
            FitShapeToRow ws, shapeItem, targetRow
        End If
    Next shapeItem
End Sub

Private Sub FitShapeToRow(ByVal ws As Worksheet, ByVal shapeItem As Shape, ByVal targetRow As Long)
    Dim targetCell As Range

    Set targetCell = ws.Cells(targetRow, PHOTO_COLUMN)
    ws.Rows(targetRow).RowHeight = Application.CentimetersToPoints(PHOTO_HEIGHT_CM)

    With shapeItem
        .LockAspectRatio = msoFalse
        .Width = Application.CentimetersToPoints(PHOTO_WIDTH_CM)
        .Height = Application.CentimetersToPoints(PHOTO_HEIGHT_CM)
        .Left = targetCell.Left
        .Top = targetCell.Top
        .Placement = xlMoveAndSize
    End With
End Sub

Private Sub PreparePhotoColumn(ByVal ws As Worksheet)
    Dim targetWidth As Double

    targetWidth = Application.CentimetersToPoints(PHOTO_WIDTH_CM)
    ws.Columns(PHOTO_COLUMN).ColumnWidth = 1

    Do While ws.Columns(PHOTO_COLUMN).Width < targetWidth
        ws.Columns(PHOTO_COLUMN).ColumnWidth = ws.Columns(PHOTO_COLUMN).ColumnWidth + 0.25
    Loop
End Sub

Private Function IsPicture(ByVal shapeItem As Shape) As Boolean
    IsPicture = (shapeItem.Type = msoPicture Or shapeItem.Type = msoLinkedPicture)
End Function
